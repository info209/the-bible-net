import React, { useState } from 'react';

// Add state for selectors
const [selectedVersion, setSelectedVersion] = useState('');
const [selectedBook, setSelectedBook] = useState('');
const [selectedChapter, setSelectedChapter] = useState(1);

const handleVersionChange = (newVersion: string) => {
  // Store current selections
  const prevBookSlug = selectedBook;
  const prevChapterNum = Number(selectedChapter);

  setSelectedVersion(newVersion);

  // Get books for new version
  const books = getBooksForVersion(newVersion);

  // Check if previous book exists in new version
  const bookExists = books.some(book => book.slug === prevBookSlug);

  if (bookExists) {
    setSelectedBook(prevBookSlug);

    // Get chapters for the selected book in new version
    const chapters = getChaptersForBook(newVersion, prevBookSlug);

    // Check if previous chapter exists
    if (chapters.includes(prevChapterNum)) {
      setSelectedChapter(prevChapterNum);
    } else {
      setSelectedChapter(chapters[0]); // fallback to first chapter
    }
  } else {
    setSelectedBook(books[0].slug); // fallback to first book
    setSelectedChapter(getChaptersForBook(newVersion, books[0].slug)[0]);
  }
};

// Integrated in render page:
return (
  <div>
    {/* Version Selector */}
    <select
      value={selectedVersion}
      onChange={e => handleVersionChange(e.target.value)}
    >
      {versions.map(version => (
        <option key={version} value={version}>{version}</option>
      ))}
    </select>

    {/* Book Selector */}
    <select
      value={selectedBook}
      onChange={e => setSelectedBook(e.target.value)}
    >
      {getBooksForVersion(selectedVersion).map(book => (
        <option key={book.slug} value={book.slug}>{book.name}</option>
      ))}
    </select>

    {/* Chapter Selector */}
    <select
      value={selectedChapter}
      onChange={e => setSelectedChapter(Number(e.target.value))}
    >
      {getChaptersForBook(selectedVersion, selectedBook).map(chapter => (
        <option key={chapter} value={chapter}>{chapter}</option>
      ))}
    </select>
  </div>
);
