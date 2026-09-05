/**
 * PendingActionsService
 *
 * Manages the offline write queue.
 * When the user performs a write action (save verse, add highlight, create note,
 * log reading progress, etc.) while offline, the action is enqueued in IndexedDB.
 * When connectivity returns, SyncService replays these actions against the server APIs.
 */

import { getOfflineDB } from './db';
import type { PendingAction, PendingActionType } from './types';

/** After this many failed retry attempts, the action is abandoned */
const MAX_RETRY_COUNT = 5;

/** Generate a UUID v4 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

type PendingCountListener = (count: number) => void;
const countListeners = new Set<PendingCountListener>();

function emitCount(count: number) {
  countListeners.forEach((fn) => {
    try {
      fn(count);
    } catch (e) {
      console.error('[PendingActionsService] listener error:', e);
    }
  });
}

export class PendingActionsService {
  /**
   * Subscribe to changes in pending actions count.
   */
  static onCountChange(listener: PendingCountListener): () => void {
    countListeners.add(listener);
    this.getCount().then(listener).catch(() => {});
    return () => countListeners.delete(listener);
  }

  /**
   * Enqueue a pending write action.
   * Handles coalescing for like/unlike flips and create-then-delete chains.
   * Returns the generated action ID.
   */
  static async enqueue(
    type: PendingActionType,
    endpoint: string,
    method: PendingAction['method'],
    payload: Record<string, unknown>,
    options?: {
      userId?: string;
      clientMutationId?: string;
      entityTempId?: string;
      entityType?: PendingAction['entityType'];
    },
  ): Promise<string> {
    const db = await getOfflineDB();

    // 1. Coalesce Like / Unlike actions for the same content
    if (type === 'like_content' || type === 'unlike_content') {
      const contentId = payload.contentId;
      const contentType = payload.type;
      const all = await db.getAll('pending_actions');
      const existingLikeAction = all.find(
        (a) =>
          (a.type === 'like_content' || a.type === 'unlike_content') &&
          a.payload.contentId === contentId &&
          a.payload.type === contentType &&
          (!options?.userId || a.userId === options.userId),
      );

      if (existingLikeAction) {
        // Update existing action to the latest desired state
        const updated: PendingAction = {
          ...existingLikeAction,
          type,
          method,
          payload: { ...existingLikeAction.payload, ...payload },
          createdAt: new Date().toISOString(),
          retryCount: 0,
          clientMutationId: options?.clientMutationId || existingLikeAction.clientMutationId,
        };
        await db.put('pending_actions', updated);
        const newCount = await db.count('pending_actions');
        emitCount(newCount);
        return updated.id;
      }
    }

    // 2. Coalesce offline create -> edit -> delete for temporary local entities
    if (options?.entityTempId) {
      const tempId = options.entityTempId;
      const all = await db.getAll('pending_actions');

      if (type.startsWith('delete_')) {
        // Check if there is a pending 'add_' for this temp ID
        const pendingCreate = all.find(
          (a) => a.entityTempId === tempId && a.type.startsWith('add_'),
        );
        if (pendingCreate) {
          // Entity was created offline and deleted offline before ever reaching server!
          // Remove all pending actions for this tempId (create, edits, etc.)
          const matching = all.filter((a) => a.entityTempId === tempId || a.endpoint.includes(tempId));
          const tx = db.transaction('pending_actions', 'readwrite');
          await Promise.all([...matching.map((m) => tx.store.delete(m.id)), tx.done]);
          const newCount = await db.count('pending_actions');
          emitCount(newCount);
          return '';
        }
      } else if (type.startsWith('edit_') || type.startsWith('toggle_')) {
        // If there's an offline create, merge the edit into the create action
        const pendingCreate = all.find(
          (a) => a.entityTempId === tempId && a.type.startsWith('add_'),
        );
        if (pendingCreate) {
          const mergedAction: PendingAction = {
            ...pendingCreate,
            payload: { ...pendingCreate.payload, ...payload },
            createdAt: new Date().toISOString(),
          };
          await db.put('pending_actions', mergedAction);
          const newCount = await db.count('pending_actions');
          emitCount(newCount);
          return mergedAction.id;
        }
      }
    }

    const action: PendingAction = {
      id: generateId(),
      type,
      endpoint,
      method,
      payload,
      createdAt: new Date().toISOString(),
      retryCount: 0,
      userId: options?.userId,
      clientMutationId: options?.clientMutationId || generateId(),
      entityTempId: options?.entityTempId,
      entityType: options?.entityType,
    };

    try {
      await db.put('pending_actions', action);
      const newCount = await db.count('pending_actions');
      emitCount(newCount);
    } catch (err) {
      console.error('[PendingActionsService] enqueue failed:', err);
    }

    return action.id;
  }

  /**
   * Get all pending actions, optionally filtered by user, ordered by creation time.
   */
  static async getAll(userId?: string): Promise<PendingAction[]> {
    try {
      const db = await getOfflineDB();
      const actions = await db.getAllFromIndex('pending_actions', 'by_created_at');
      const filtered = userId
        ? actions.filter((a) => !a.userId || a.userId === userId)
        : actions;
      return filtered.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    } catch {
      return [];
    }
  }

  /**
   * Replace a temporary client ID with the real server ID in all dependent queued actions.
   */
  static async remapEntityId(tempId: string, realServerId: string): Promise<void> {
    try {
      const db = await getOfflineDB();
      const all = await db.getAll('pending_actions');
      const tx = db.transaction('pending_actions', 'readwrite');

      for (const action of all) {
        let changed = false;
        let endpoint = action.endpoint;
        let payload = { ...action.payload };

        if (endpoint.includes(tempId)) {
          endpoint = endpoint.replace(tempId, realServerId);
          changed = true;
        }

        if (action.entityTempId === tempId) {
          action.entityTempId = undefined;
          changed = true;
        }

        if (payload._id === tempId || payload.id === tempId) {
          if (payload._id === tempId) payload._id = realServerId;
          if (payload.id === tempId) payload.id = realServerId;
          changed = true;
        }

        if (changed) {
          await tx.store.put({
            ...action,
            endpoint,
            payload,
          });
        }
      }

      await tx.done;
    } catch (err) {
      console.warn('[PendingActionsService] remapEntityId failed:', err);
    }
  }

  /**
   * Get the count of pending actions, optionally filtered by userId.
   */
  static async getCount(userId?: string): Promise<number> {
    try {
      const db = await getOfflineDB();
      if (!userId) {
        return await db.count('pending_actions');
      }
      const actions = await this.getAll(userId);
      return actions.length;
    } catch {
      return 0;
    }
  }

  /**
   * Remove a successfully synced action.
   */
  static async remove(id: string): Promise<void> {
    try {
      const db = await getOfflineDB();
      await db.delete('pending_actions', id);
      const newCount = await db.count('pending_actions');
      emitCount(newCount);
    } catch (err) {
      console.warn('[PendingActionsService] remove failed:', err);
    }
  }

  /**
   * Mark an action as failed (increment retry count).
   * If retryCount exceeds MAX_RETRY_COUNT, the action is removed permanently.
   */
  static async markFailed(id: string, error: string): Promise<void> {
    try {
      const db = await getOfflineDB();
      const action = await db.get('pending_actions', id);
      if (!action) return;

      if (action.retryCount >= MAX_RETRY_COUNT) {
        console.warn(
          `[PendingActionsService] Abandoning action ${id} after ${MAX_RETRY_COUNT} attempts:`,
          action.type,
          error,
        );
        await db.delete('pending_actions', id);
        const newCount = await db.count('pending_actions');
        emitCount(newCount);
        return;
      }

      await db.put('pending_actions', {
        ...action,
        retryCount: action.retryCount + 1,
        lastAttemptAt: new Date().toISOString(),
        lastError: error,
      });
    } catch (err) {
      console.warn('[PendingActionsService] markFailed failed:', err);
    }
  }

  /**
   * Clear all pending actions (used when user signs out or clears offline data).
   */
  static async clearAll(): Promise<void> {
    try {
      const db = await getOfflineDB();
      await db.clear('pending_actions');
      emitCount(0);
    } catch (err) {
      console.warn('[PendingActionsService] clearAll failed:', err);
    }
  }
}
