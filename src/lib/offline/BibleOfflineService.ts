/**
 * BibleOfflineService
 *
 * CRUD operations on `bible_versions`, `bible_books`, `bible_chapters`, and
 * `download_status` stores. Supports book-level and chapter-level queries.
 */

import {
  getOfflineDB,
  buildChapterKey,
  buildBookDownloadKey,
  buildChapterDownloadKey,
} from './db';
import type {
  OfflineVersionData,
  OfflineBookData,
  OfflineChapterData,
  DownloadRecord,
} from './types';

export class BibleOfflineService {
  // -------------------------------------------------------------------------
  // Versions
  // -------------------------------------------------------------------------

  static async saveVersion(version: OfflineVersionData): Promise<void> {
    try {
      const db = await getOfflineDB();
      await db.put('bible_versions', version);
    } catch (err) {
      console.error('[BibleOfflineService] saveVersion failed:', err);
    }
  }

  static async getVersion(versionId: string): Promise<OfflineVersionData | undefined> {
    try {
      const db = await getOfflineDB();
      return await db.get('bible_versions', versionId);
    } catch {
      return undefined;
    }
  }

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

  static async saveBooks(books: OfflineBookData[]): Promise<void> {
    try {
      const db = await getOfflineDB();
      const tx = db.transaction('bible_books', 'readwrite');
      await Promise.all([...books.map((b) => tx.store.put(b)), tx.done]);
    } catch (err) {
      console.error('[BibleOfflineService] saveBooks failed:', err);
    }
  }

  static async getBooks(versionId: string): Promise<OfflineBookData[]> {
    try {
      const db = await getOfflineDB();
      let books = await db.getAllFromIndex('bible_books', 'by_version', versionId);
      if (books.length === 0) {
        const all = await db.getAll('bible_books');
        books = all.filter((b) => b.versionId === versionId);
      }
      return books.sort((a, b) => a.order - b.order);
    } catch {
      return [];
    }
  }

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

  static async saveChapter(chapter: OfflineChapterData): Promise<void> {
    try {
      const db = await getOfflineDB();
      await db.put('bible_chapters', chapter);
    } catch (err) {
      console.error('[BibleOfflineService] saveChapter failed:', err);
    }
  }

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

  static async getChapter(
    versionIdOrAbbr: string,
    bookIdOrName: string,
    chapterNumber: number,
  ): Promise<OfflineChapterData | undefined> {
    try {
      const db = await getOfflineDB();
      const num = Number(chapterNumber);

      // Strategy 1: Direct key lookup with exact parameters
      const key1 = buildChapterKey(versionIdOrAbbr, bookIdOrName, num);
      const direct = await db.get('bible_chapters', key1);
      if (direct && direct.verses && direct.verses.length > 0) return direct;

      // Strategy 2: Search by index 'by_version_book'
      try {
        const chaptersByBook = await db.getAllFromIndex(
          'bible_chapters',
          'by_version_book',
          [versionIdOrAbbr, bookIdOrName],
        );
        const matchInBook = chaptersByBook.find((c) => Number(c.chapterNumber) === num);
        if (matchInBook && matchInBook.verses && matchInBook.verses.length > 0) return matchInBook;
      } catch {
        // Index lookup fallback
      }

      // Strategy 3: Comprehensive scan across all stored chapters
      const allChapters = await db.getAll('bible_chapters');
      if (allChapters.length === 0) return undefined;

      const targetBookClean = String(bookIdOrName).toLowerCase().replace(/[-_]/g, ' ').trim();
      const targetVerClean = String(versionIdOrAbbr).toLowerCase().trim();

      const matched = allChapters.find((c) => {
        if (Number(c.chapterNumber) !== num) return false;

        const cBookNameClean = (c.bookName || '').toLowerCase().replace(/[-_]/g, ' ').trim();
        const cBookIdClean = (c.bookId || '').toLowerCase().replace(/[-_]/g, ' ').trim();
        const cBookAbbrClean = (c.bookAbbreviation || '').toLowerCase().replace(/[-_]/g, ' ').trim();

        const bookMatches =
          cBookNameClean === targetBookClean ||
          cBookIdClean === targetBookClean ||
          cBookAbbrClean === targetBookClean ||
          cBookNameClean.includes(targetBookClean) ||
          targetBookClean.includes(cBookNameClean);

        if (!bookMatches) return false;

        const cVerIdClean = (c.versionId || '').toLowerCase().trim();
        const cVerAbbrClean = (c.bookAbbreviation || c.versionId || '').toLowerCase().trim();

        const versionMatches =
          !targetVerClean ||
          cVerIdClean === targetVerClean ||
          cVerAbbrClean === targetVerClean ||
          c.id.toLowerCase().includes(targetVerClean);

        return versionMatches || true;
      });

      return matched;
    } catch {
      return undefined;
    }
  }

  static async getChaptersByBook(versionId: string, bookId: string): Promise<OfflineChapterData[]> {
    try {
      const db = await getOfflineDB();
      return await db.getAllFromIndex('bible_chapters', 'by_version_book', [versionId, bookId]);
    } catch {
      return [];
    }
  }

  static async getChaptersByVersion(versionId: string): Promise<OfflineChapterData[]> {
    try {
      const db = await getOfflineDB();
      return await db.getAllFromIndex('bible_chapters', 'by_version', versionId);
    } catch {
      return [];
    }
  }

  static async deleteChaptersForBook(versionId: string, bookId: string): Promise<void> {
    try {
      const chapters = await this.getChaptersByBook(versionId, bookId);
      if (chapters.length === 0) return;
      const db = await getOfflineDB();
      const tx = db.transaction('bible_chapters', 'readwrite');
      await Promise.all([...chapters.map((c) => tx.store.delete(c.id)), tx.done]);
    } catch (err) {
      console.error('[BibleOfflineService] deleteChaptersForBook failed:', err);
    }
  }

  static async deleteSingleChapter(
    versionId: string,
    bookId: string,
    chapterNumber: number,
  ): Promise<void> {
    try {
      const key = buildChapterKey(versionId, bookId, chapterNumber);
      const db = await getOfflineDB();
      await db.delete('bible_chapters', key);
      await db.delete('chapter_access_log', key);
      const recordKey = buildChapterDownloadKey(versionId, bookId, chapterNumber);
      await db.delete('download_status', recordKey);
    } catch (err) {
      console.error('[BibleOfflineService] deleteSingleChapter failed:', err);
    }
  }

  // -------------------------------------------------------------------------
  // Download Status (Book, Chapter & Version)
  // -------------------------------------------------------------------------

  static async setDownloadStatus(record: DownloadRecord): Promise<void> {
    try {
      const db = await getOfflineDB();
      await db.put('download_status', record);
    } catch (err) {
      console.error('[BibleOfflineService] setDownloadStatus failed:', err);
    }
  }

  static async getDownloadStatus(id: string): Promise<DownloadRecord | undefined> {
    try {
      const db = await getOfflineDB();
      return await db.get('download_status', id);
    } catch {
      return undefined;
    }
  }

  static async getVersionDownloadStatus(
    versionId: string,
  ): Promise<DownloadRecord | undefined> {
    return this.getDownloadStatus(versionId);
  }

  static async getBookDownloadStatus(
    versionId: string,
    bookId: string,
  ): Promise<DownloadRecord | undefined> {
    const key = buildBookDownloadKey(versionId, bookId);
    return this.getDownloadStatus(key);
  }

  static async getChapterDownloadStatus(
    versionId: string,
    bookId: string,
    chapterNumber: number,
  ): Promise<DownloadRecord | undefined> {
    const key = buildChapterDownloadKey(versionId, bookId, chapterNumber);
    return this.getDownloadStatus(key);
  }

  static async getAllDownloadStatuses(): Promise<DownloadRecord[]> {
    try {
      const db = await getOfflineDB();
      return await db.getAll('download_status');
    } catch {
      return [];
    }
  }

  static async updateDownloadProgress(
    id: string,
    patch: Partial<DownloadRecord>,
  ): Promise<void> {
    try {
      const db = await getOfflineDB();
      const existing = await db.get('download_status', id);
      if (existing) {
        await db.put('download_status', { ...existing, ...patch });
      }
    } catch (err) {
      console.error('[BibleOfflineService] updateDownloadProgress failed:', err);
    }
  }

  static async deleteDownloadStatus(id: string): Promise<void> {
    try {
      const db = await getOfflineDB();
      await db.delete('download_status', id);
    } catch (err) {
      console.error('[BibleOfflineService] deleteDownloadStatus failed:', err);
    }
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  static async isVersionDownloaded(versionId: string): Promise<boolean> {
    const status = await this.getVersionDownloadStatus(versionId);
    if (status?.status === 'downloaded') return true;

    // Also check by version abbreviation if versionId is an abbreviation
    const allStatuses = await this.getAllDownloadStatuses();
    const match = allStatuses.find(
      (s) =>
        (s.versionId === versionId || s.versionAbbreviation?.toLowerCase() === versionId.toLowerCase()) &&
        s.status === 'downloaded' &&
        (s.targetType === 'version' || !s.targetType),
    );
    return !!match;
  }

  static async isBookDownloaded(versionId: string, bookId: string): Promise<boolean> {
    // If the entire version is downloaded, book is downloaded
    if (await this.isVersionDownloaded(versionId)) return true;
    const status = await this.getBookDownloadStatus(versionId, bookId);
    return status?.status === 'downloaded';
  }

  static async isChapterDownloaded(
    versionId: string,
    bookId: string,
    chapterNumber: number,
  ): Promise<boolean> {
    // If the entire version is downloaded, chapter is downloaded
    if (await this.isVersionDownloaded(versionId)) return true;
    const status = await this.getChapterDownloadStatus(versionId, bookId, chapterNumber);
    if (status?.status === 'downloaded') return true;

    // If the whole book is downloaded, chapter is also downloaded
    return this.isBookDownloaded(versionId, bookId);
  }

  static async estimateVersionSize(versionId: string): Promise<number> {
    try {
      const chapters = await this.getChaptersByVersion(versionId);
      let totalChars = 0;
      for (const chapter of chapters) {
        if (Array.isArray(chapter.verses)) {
          for (const verse of chapter.verses) {
            totalChars += (verse.text || '').length;
          }
        }
      }
      return Math.round(totalChars * 2.5) || 5 * 1024 * 1024;
    } catch {
      return 0;
    }
  }

  static async estimateBookSize(versionId: string, bookId: string): Promise<number> {
    try {
      const chapters = await this.getChaptersByBook(versionId, bookId);
      let totalChars = 0;
      for (const chapter of chapters) {
        for (const verse of chapter.verses) {
          totalChars += verse.text.length;
        }
      }
      return Math.round(totalChars * 2.5);
    } catch {
      return 0;
    }
  }

  static async deleteChaptersForVersion(versionId: string): Promise<void> {
    try {
      const db = await getOfflineDB();
      const chapters = await db.getAllFromIndex('bible_chapters', 'by_version', versionId);
      if (chapters.length > 0) {
        const tx = db.transaction(['bible_chapters', 'chapter_access_log'], 'readwrite');
        await Promise.all([
          ...chapters.map((c) => tx.objectStore('bible_chapters').delete(c.id)),
          ...chapters.map((c) => tx.objectStore('chapter_access_log').delete(c.id)),
          tx.done,
        ]);
      }
    } catch (err) {
      console.error('[BibleOfflineService] deleteChaptersForVersion failed:', err);
    }
  }

  static async deleteVersionData(versionId: string): Promise<void> {
    try {
      const db = await getOfflineDB();
      // 1. Delete all chapters and access logs for this version
      await this.deleteChaptersForVersion(versionId);

      // 2. Delete all books for this version
      await this.deleteBooks(versionId);

      // 3. Delete version entry
      await db.delete('bible_versions', versionId);

      // 4. Delete download status record
      await this.deleteDownloadStatus(versionId);
    } catch (err) {
      console.error('[BibleOfflineService] deleteVersionData failed:', err);
    }
  }

  static async deleteBookData(versionId: string, bookId: string): Promise<void> {
    const bookKey = buildBookDownloadKey(versionId, bookId);
    await this.deleteChaptersForBook(versionId, bookId);
    await this.deleteDownloadStatus(bookKey);
  }
}
