const fs = require('fs');
const filepath = 'src/app/components/BibleReaderPage.tsx';
let code = fs.readFileSync(filepath, 'utf8');

// Update state definitions
code = code.replace(
  /const \[selectedBook, setSelectedBook\] = useState\('Genesis'\);/,
  "const [selectedBookId, setSelectedBookId] = useState<string | null>(null);\n  const [displayBookName, setDisplayBookName] = useState('Genesis');"
);
code = code.replace(
  /const \[selectedVersion, setSelectedVersion\] = useState\('KJV'\);/,
  "const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);\n  const [displayVersionName, setDisplayVersionName] = useState('KJV');"
);

// Update fetchVersions
code = code.replace(
  /setBibleVersions\(mappedVersions\);/,
  "setBibleVersions(mappedVersions);\n          if (mappedVersions.length > 0 && !selectedVersionId) {\n            setSelectedVersionId(mappedVersions[0].id);\n            setDisplayVersionName(mappedVersions[0].fullName);\n          }"
);

// Update mappedVersions id addition
code = code.replace(
  /name: v\.abbreviation,/g,
  "id: v._id,\n            name: v.abbreviation,"
);

// Update fetchBooks params
code = code.replace(
  /if \(!selectedVersion \|\| selectedVersion === 'undefined'\) return;/,
  "if (!selectedVersionId) return;"
);
code = code.replace(
  /let validVersion = selectedVersion;([\s\S]*?)validVersion = 'KJV';\n      }/,
  "let validVersion = selectedVersionId;"
);

// Update bibleBooksState to hold objects
code = code.replace(
  /const ot = books\.filter\(\(b: any\) => b\.testament === 'OT'\)\.map\(\(b: any\) => b\.name\);\n          const nt = books\.filter\(\(b: any\) => b\.testament === 'NT'\)\.map\(\(b: any\) => b\.name\);/,
  "const ot = books.filter((b: any) => b.testament === 'OT').map((b: any) => ({ id: b._id, name: b.name }));\n          const nt = books.filter((b: any) => b.testament === 'NT').map((b: any) => ({ id: b._id, name: b.name }));"
);

// Initial state of bibleBooksState
code = code.replace(
  /const \[bibleBooksState, setBibleBooksState\] = useState<typeof bibleBooks>\(bibleBooks\);/,
  "const [bibleBooksState, setBibleBooksState] = useState<{ 'Old Testament': { id: string, name: string }[], 'New Testament': { id: string, name: string }[] }>({ 'Old Testament': bibleBooks['Old Testament'].map(n => ({ id: n, name: n })), 'New Testament': bibleBooks['New Testament'].map(n => ({ id: n, name: n })) });"
);

// Set default bookId
code = code.replace(
  /setBibleBooksState\(\{([\s\S]*?)\}\);/g,
  function(match, p1) {
    if (p1.includes('Old Testament')) {
      return "setBibleBooksState({" + p1 + "});\n          if (ot.length > 0 && !selectedBookId) {\n            setSelectedBookId(ot[0].id);\n            setDisplayBookName(ot[0].name);\n          } else if (nt.length > 0 && !selectedBookId) {\n            setSelectedBookId(nt[0].id);\n            setDisplayBookName(nt[0].name);\n          }";
    }
    return match;
  }
);

// Dropdown click handlers for Books
code = code.replace(
  /setSelectedBook\(book\);/g,
  "setSelectedBookId(book.id);\n                              setDisplayBookName(book.name);"
);

// fetchChapters logic
code = code.replace(
  /!selectedBook \|\| selectedBook === 'undefined'/g,
  "!selectedBookId"
);

// fetchVerses logic
code = code.replace(
  /!selectedBook \|\| !selectedChapter \|\| selectedBook === 'undefined'/g,
  "!selectedBookId || !selectedChapter"
);

// API URLs update
code = code.replace(
  /fetch\(\`\/api\/v1\/bible\/\$\{encodeURIComponent\(validVersion\)\}\/books\`\);/g,
  "fetch(`/api/v1/bible/${validVersion}/books`);"
);
code = code.replace(
  /fetch\(\`\/api\/v1\/bible\/\$\{encodeURIComponent\(validVersion\)\}\/\$\{encodeURIComponent\(selectedBook\)\}\/chapters\`\);/g,
  "fetch(`/api/v1/bible/${validVersion}/${selectedBookId}/chapters`);"
);
code = code.replace(
  /fetch\(\`\/api\/v1\/bible\/\$\{encodeURIComponent\(validVersion\)\}\/\$\{encodeURIComponent\(selectedBook\)\}\/\$\{selectedChapter\}\`\);/g,
  "fetch(`/api/v1/bible/${validVersion}/${selectedBookId}/${selectedChapter}`);"
);

// Navigation logic mapping
code = code.replace(
  /const currentBookIndex = allBooks\.indexOf\(selectedBook\);/,
  "const currentBookIndex = allBooks.findIndex(b => b.id === selectedBookId);"
);
code = code.replace(
  /selectedBook === allBooks\[0\]/g,
  "selectedBookId === allBooks[0]?.id"
);
code = code.replace(
  /selectedBook === allBooks\[allBooks\.length - 1\]/g,
  "selectedBookId === allBooks[allBooks.length - 1]?.id"
);

code = code.replace(
  /const getNextChapter = \(\) => {([\s\S]*?)}/g,
  "const getNextChapter = () => {\n    if (selectedChapter < totalChapters) {\n      return { book: displayBookName, chapter: selectedChapter + 1 };\n    } else if (currentBookIndex < allBooks.length - 1) {\n      return { book: allBooks[currentBookIndex + 1].name, chapter: 1 };\n    }\n    return { book: displayBookName, chapter: selectedChapter };\n  }"
);
code = code.replace(
  /const getPrevChapter = \(\) => {([\s\S]*?)}/g,
  "const getPrevChapter = () => {\n    if (selectedChapter > 1) {\n      return { book: displayBookName, chapter: selectedChapter - 1 };\n    } else if (currentBookIndex > 0) {\n      const prevBook = allBooks[currentBookIndex - 1];\n      return { book: prevBook.name, chapter: bookChapters[prevBook.name] || 50 };\n    }\n    return { book: displayBookName, chapter: selectedChapter };\n  }"
);

// handlePrevious / handleNext
code = code.replace(
  /setSelectedBook\(prevBook\);/g,
  "setSelectedBookId(prevBook.id);\n        setDisplayBookName(prevBook.name);"
);
code = code.replace(
  /setSelectedChapter\(bookChapters\[prevBook\] \|\| 50\);/g,
  "setSelectedChapter(bookChapters[prevBook.name] || 50);"
);

code = code.replace(
  /setSelectedBook\(nextBook\);/g,
  "setSelectedBookId(nextBook.id);\n        setDisplayBookName(nextBook.name);"
);

// Map the UI Rendering books
code = code.replace(
  /book: string/g,
  "book: { id: string, name: string }"
);
code = code.replace(
  /key=\{book\}/g,
  "key={typeof book === 'string' ? book : book.id}"
);
code = code.replace(
  /selectedBook === book/g,
  "selectedBookId === book.id"
);
code = code.replace(
  /\{typeof book === 'string' \? book : book\.id\}\n                              <\/button>/g,
  "{book.name}\n                            </button>"
);
code = code.replace(
  /\{book\}\n                              <\/button>/g,
  "{book.name}\n                            </button>"
);

// Version switching
code = code.replace(
  /setSelectedVersion\(version\.name\);/g,
  "setSelectedVersionId(version.id);\n                                setDisplayVersionName(version.fullName);"
);
code = code.replace(
  /selectedVersion === version\.name/g,
  "selectedVersionId === version.id"
);

// UI Dropdowns
code = code.replace(
  /<span className=\"text-sm font-normal\">\{selectedBook\}<\/span>/,
  '<span className="text-sm font-normal">{displayBookName}</span>'
);
code = code.replace(
  /<span className=\"text-sm font-normal\">\{selectedVersion\}<\/span>/,
  '<span className="text-sm font-normal">{displayVersionName}</span>'
);

// update console.log mentions
code = code.replace(
  /selectedBook, selectedChapter/g,
  "selectedBookId, selectedChapter"
);
code = code.replace(
  /selectedBookId, selectedChapter, selectedVersion, bibleVersions/g,
  "selectedBookId, selectedChapter, selectedVersionId, bibleVersions"
);
code = code.replace(
  /\`verse-\$\{selectedBook\}-\$\{selectedChapter\}-\$\{verseNumber\}\`/g,
  "`verse-${selectedBookId}-${selectedChapter}-${verseNumber}`"
);
code = code.replace(
  /handleNavigateToVerse = \(book: string, chapter: number, verse: number\) => {([\s\S]*?)setSelectedBook\(book\);/g,
  "handleNavigateToVerse = (bookId: string, bookName: string, chapter: number, verse: number) => {\n    setSelectedBookId(bookId);\n    setDisplayBookName(bookName);"
);
code = code.replace(
  /verseElement = document\.getElementById\(\`verse-\$\{book\}-\$\{chapter\}-\$\{verse\}\`\);/g,
  "verseElement = document.getElementById(`verse-${bookId}-${chapter}-${verse}`);"
);

// fix any residual dependencies arrays
code = code.replace(
  /\[selectedBookId, selectedVersion\]/g,
  "[selectedBookId, selectedVersionId]"
);
code = code.replace(
  /\[selectedBookId, selectedChapter, selectedVersion\]/g,
  "[selectedBookId, selectedChapter, selectedVersionId]"
);


fs.writeFileSync(filepath, code);
