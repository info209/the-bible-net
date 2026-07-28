/**
 * BibleOfflineService
 *
 * CRUD operations on the `bible_versions`, `bible_books`, and `bible_chapters`
 * IndexedDB stores.  All public methods are safe to call from client components.
 */

import { getOfflineDB, buildChapterKey } from './db';
import type {
  OfflineVersionData,
  OfflineBookData,
  OfflineChapterData,
  OfflineVerseData,
  VersionDownloadRecord,
  DownloadStatus,
} from './types';

export class BibleOfflineService {
  // -------------------------------------------------------------------------
  // Versions
  // -------------------------------------------------------------------------

  /** Save (upsert) a Bible version's metadata */
  static async saveVersion(version: OfflineVersionData): Promise<void> {
    try {
      const db = await getOfflineDB();
      await db.put('bible_versions', version);
    } catch (err) {
      console.error('[BibleOfflineService] saveVersion failed:', err);
    }
  }

  /** Get a single version by its MongoDB _id */
  static async getVersion(versionId: string): Promise<OfflineVersionData | undefined> {
    try {
      const db = await getOfflineDB();
      return await db.get('bible_versions', versionId);
    } catch {
      return undefined;
    }
  }

  /** Get all stored versions */
  static async getAllVersions(): Promise<OfflineVersionData[]> {
    try {
      const db = await getOfflineDB();
      return await db.getAll('bible_versions');
    } catch {
      return [];
    }
  }

  // -------------------------------------------------------------------------
  // Books
  // -------------------------------------------------------------------------

  /** Bulk-save books for a version */
  static async saveBooks(books: OfflineBookData[]): Promise<void> {
    try {
      const db = await getOfflineDB();
      const tx = db.transaction('bible_books', 'readwrite');
      await Promise.all([...books.map((b) => tx.store.put(b)), tx.done]);
    } catch (err) {
      console.error('[BibleOfflineService] saveBooks failed:', err);
    }
  }

  /** Get all books for a version, sorted by `order` */
  static async getBooks(versionId: string): Promise<OfflineBookData[]> {
    try {
      const db = await getOfflineDB();
      const books = await db.getAllFromIndex('bible_books', 'by_version', versionId);
      return books.sort((a, b) => a.order - b.order);
    } catch {
      return [];
    }
  }

  /** Delete all books for a version */
  static async deleteBooks(versionId: string): Promise<void> {
    try {
      const db = await getOfflineDB();
      const books = await db.getAllFromIndex('bible_books', 'by_version', versionId);
      const tx = db.transaction('bible_books', 'readwrite');
      await Promise.all([...books.map((b) => tx.store.delete(b.id)), tx.done]);
    } catch (err) {
      console.error('[BibleOfflineService] deleteBooks failed:', err);
    }
  }

  // -------------------------------------------------------------------------
  // Chapters
  // -------------------------------------------------------------------------

  /** Save a single chapter with its verses */
  static async saveChapter(chapter: OfflineChapterData): Promise<void> {
    try {
      const db = await getOfflineDB();
      await db.put('bible_chapters', chapter);
    } catch (err) {
      console.error('[BibleOfflineService] saveChapter failed:', err);
    }
  }

  /** Bulk-save chapters (used during version download) */
  static async saveChapters(chapters: OfflineChapterData[]): Promise<void> {
    if (chapters.length === 0) return;
    try {
      const db = await getOfflineDB();
      const tx = db.transaction('bible_chapters', 'readwrite');
      await Promise.all([...chapters.map((c) => tx.store.put(c)), tx.done]);
    } catch (err) {
      console.error('[BibleOfflineService] saveChapters failed:', err);
    }
  }

  /**
   * Get a chapter's content (with verses) from offline storage.
   * Returns undefined if not cached/downloaded.
   */
  static async getChapter(
    versionId: string,
    bookId: string,
    chapterNumber: number,
  ): Promise<OfflineChapterData | undefined> {
    try {
      const db = await getOfflineDB();
      const key = buildChapterKey(versionId, bookId, chapterNumber);
      return await db.get('bible_chapters', key);
    } catch {
      return undefined;
    }
  }

  /** Get all chapters for a version (used when deleting a version) */
  static async getChaptersByVersion(versionId: string): Promise<OfflineChapterData[]> {
    try {
      const db = await getOfflineDB();
      return await db.getAllFromIndex('bible_chapters', 'by_version', versionId);
    } catch {
      return [];
    }
  }

  /** Delete all chapters for a specific book in a version */
  static async deleteChaptersForBook(versionId: string, bookId: string): Promise<void> {
    try {
      const db = await getOfflineDB();
      const chapters = await db.getAllFromIndex(
        'bible_chapters',
        'by_version_book',
        [versionId, bookId],
      );
      const tx = db.transaction('bible_chapters', 'readwrite');
      await Promise.all([...chapters.map((c) => tx.store.delete(c.id)), tx.done]);
    } catch (err) {
      console.error('[BibleOfflineService] deleteChaptersForBook failed:', err);
    }
  }

  /** Delete ALL chapters for a version (used when deleting a downloaded version) */
  static async deleteAllChaptersForVersion(versionId: string): Promise<void> {
    try {
      const chapters = await this.getChaptersByVersion(versionId);
      if (chapters.length === 0) return;
      const db = await getOfflineDB();
      const tx = db.transaction('bible_chapters', 'readwrite');
      await Promise.all([...chapters.map((c) => tx.store.delete(c.id)), tx.done]);
    } catch (err) {
      console.error('[BibleOfflineService] deleteAllChaptersForVersion failed:', err);
    }
  }

  // -------------------------------------------------------------------------
  // Download Status
  // -------------------------------------------------------------------------

  /** Upsert a version's download record */
  static async setDownloadStatus(record: VersionDownloadRecord): Promise<void> {
    try {
      const db = await getOfflineDB();
      await db.put('download_status', record);
    } catch (err) {
      console.error('[BibleOfflineService] setDownloadStatus failed:', err);
    }
  }

  /** Get download status for a version */
  static async getDownloadStatus(versionId: string): Promise<VersionDownloadRecord | undefined> {
    try {
      const db = await getOfflineDB();
      return await db.get('download_status', versionId);
    } catch {
      return undefined;
    }
  }

  /** Get all download records */
  static async getAllDownloadStatuses(): Promise<VersionDownloadRecord[]> {
    try {
      const db = await getOfflineDB();
      return await db.getAll('download_status');
    } catch {
      return [];
    }
  }

  /** Quick helper: update just the status + progress fields */
  static async updateDownloadProgress(
    versionId: string,
    patch: Partial<VersionDownloadRecord>,
  ): Promise<void> {
    try {
      const db = await getOfflineDB();
      const existing = await db.get('download_status', versionId);
      if (existing) {
        await db.put('download_status', { ...existing, ...patch });
      }
    } catch (err) {
      console.error('[BibleOfflineService] updateDownloadProgress failed:', err);
    }
  }

  /** Remove a version's download record entirely */
  static async deleteDownloadStatus(versionId: string): Promise<void> {
    try {
      const db = await getOfflineDB();
      await db.delete('download_status', versionId);
    } catch (err) {
      console.error('[BibleOfflineService] deleteDownloadStatus failed:', err);
    }
  }

  // -------------------------------------------------------------------------
  // High-level helpers
  // -------------------------------------------------------------------------

  /** Whether a version is fully downloaded (status === 'downloaded') */
  static async isVersionDownloaded(versionId: string): Promise<boolean> {
    const status = await this.getDownloadStatus(versionId);
    return status?.status === 'downloaded';
  }

  /**
   * Full delete: removes download status, books, and all chapters for this version.
   * Does NOT remove the version metadata (so it still appears in the downloads list).
   */
  static async deleteVersionData(versionId: string): Promise<void> {
    await Promise.all([
      this.deleteBooks(versionId),
      this.deleteAllChaptersForVersion(versionId),
      this.deleteDownloadStatus(versionId),
    ]);
  }

  /**
   * Estimate storage used by a version (rough calculation based on verse character counts).
   * Returns bytes.
   */
  static async estimateVersionSize(versionId: string): Promise<number> {
    try {
      const chapters = await this.getChaptersByVersion(versionId);
      let totalChars = 0;
      for (const chapter of chapters) {
        for (const verse of chapter.verses) {
          totalChars += verse.text.length;
        }
      }
      // UTF-8: approximately 1–2 bytes per character for English/Latin scripts;
      // ~3 bytes for Telugu/Hindi. Use 2x as a conservative multiplier plus JSON overhead.
      return Math.round(totalChars * 2.5);
    } catch {
      return 0;
    }
  }
}
