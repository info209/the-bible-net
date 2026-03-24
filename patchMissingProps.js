const fs = require('fs');
const bibleReaderFile = 'c:\\Users\\Pranjal Singh\\OneDrive\\Desktop\\Projects\\the-bible-net-prod\\src\\app\\components\\BibleReaderPage.tsx';
let brCode = fs.readFileSync(bibleReaderFile, 'utf8');

brCode = brCode.replace(/readingVerse=\{([^\}]+)\}\s+theme=\{currentTheme\}/g, function(match, readingVar) {
    if (match.includes('selectedVerses=')) return match;
    return "readingVerse={" + readingVar + "}\n                  selectedVerses={selectedVerses}\n                  onVerseLongPress={handleVerseLongPress}\n                  onVerseTap={handleVerseTap}\n                  theme={currentTheme}";
});

fs.writeFileSync(bibleReaderFile, brCode, 'utf8');
console.log('Props patched in BibleReaderPage!');
