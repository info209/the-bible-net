import React, { useState } from 'react';

interface Book {
  slug: string;
  name: string;
  testament: string;
  chapterVerseCounts: Record<string, number>;
}

interface BibleSelectorProps {
  versions: Array<{ id: string; displayName: string; language: string }>;
  books: Book[];
}

const BibleSelector: React.FC<BibleSelectorProps> = ({ versions, books }) => {
  const [selectedVersion, setSelectedVersion] = useState(versions[0]?.id || '');
  const [selectedBook, setSelectedBook] = useState(books[0]?.slug || '');
  const [selectedChapter, setSelectedChapter] = useState(1);

  // Helper to get chapters for a book
  const getChaptersForBook = (bookSlug: string) => {
    const book = books.find(b => b.slug === bookSlug);
    if (!book || !book.chapterVerseCounts) return [];
    return Object.keys(book.chapterVerseCounts).map(Number).sort((a, b) => a - b);
  };

  const handleVersionChange = (newVersion: string) => {
    // Store current selections
    const prevBookSlug = selectedBook;
    const prevChapterNum = Number(selectedChapter);

    setSelectedVersion(newVersion);

    // Filter books for new version (assuming books prop is already filtered)
    // If you need to filter books by version, do it here
    // For now, use all books
    const bookExists = books.some(book => book.slug === prevBookSlug);

    if (bookExists) {
      setSelectedBook(prevBookSlug);
      const chapters = getChaptersForBook(prevBookSlug);
      if (chapters.includes(prevChapterNum)) {
        setSelectedChapter(prevChapterNum);
      } else {
        setSelectedChapter(chapters[0]);
      }
    } else {
      setSelectedBook(books[0]?.slug || '');
      setSelectedChapter(getChaptersForBook(books[0]?.slug)[0] || 1);
    }
  };

  return (
    <div>
      {/* Version Selector */}
      <select
        value={selectedVersion}
        onChange={e => handleVersionChange(e.target.value)}
      >
        {versions.map(version => (
          <option key={version.id} value={version.id}>{version.displayName} ({version.language})</option>
        ))}
      </select>

      {/* Book Selector */}
      <select
        value={selectedBook}
        onChange={e => setSelectedBook(e.target.value)}
      >
        {books.map(book => (
          <option key={book.slug} value={book.slug}>{book.name}</option>
        ))}
      </select>

      {/* Chapter Selector */}
      <select
        value={selectedChapter}
        onChange={e => setSelectedChapter(Number(e.target.value))}
      >
        {getChaptersForBook(selectedBook).map(chapter => (
          <option key={chapter} value={chapter}>{chapter}</option>
        ))}
      </select>
    </div>
  );
};

export default BibleSelector;
