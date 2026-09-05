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
   * Returns the generated action ID.
   */
  static async enqueue(
    type: PendingActionType,
    endpoint: string,
    method: PendingAction['method'],
    payload: Record<string, unknown>,
  ): Promise<string> {
    const action: PendingAction = {
      id: generateId(),
      type,
      endpoint,
      method,
      payload,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };

    try {
      const db = await getOfflineDB();
      await db.put('pending_actions', action);
      const newCount = await db.count('pending_actions');
      emitCount(newCount);
    } catch (err) {
      console.error('[PendingActionsService] enqueue failed:', err);
    }

    return action.id;
  }

  /**
   * Get all pending actions, ordered by creation time (oldest first).
   */
  static async getAll(): Promise<PendingAction[]> {
    try {
      const db = await getOfflineDB();
      const actions = await db.getAllFromIndex('pending_actions', 'by_created_at');
      return actions.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    } catch {
      return [];
    }
  }

  /**
   * Get the count of pending actions.
   */
  static async getCount(): Promise<number> {
    try {
      const db = await getOfflineDB();
      return await db.count('pending_actions');
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
          `[PendingActionsService] Abandoning action ${id} after ${MAX_RETRY_COUNT} attempts`,
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
