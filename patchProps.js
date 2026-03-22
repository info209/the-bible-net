const fs = require('fs');

const bibleReaderFile = 'c:\\Users\\Pranjal Singh\\OneDrive\\Desktop\\Projects\\the-bible-net-prod\\src\\app\\components\\BibleReaderPage.tsx';

let brCode = fs.readFileSync(bibleReaderFile, 'utf8');

// Replace all `<ChapterContent ... theme={currentTheme}` with injected props before theme
brCode = brCode.replace(/<ChapterContent([^>]*?)theme=\{currentTheme\}/g, (match, prefix) => {
    // Avoid double-injecting
    if (prefix.includes('selectedVerses=')) return match;
    
    return \`<ChapterContent\${prefix}selectedVerses={selectedVerses}
                  onVerseLongPress={handleVerseLongPress}
                  onVerseTap={handleVerseTap}
                  theme={currentTheme}\`;
});

// Fix the stopTTS reference
brCode = brCode.replace(/\\/\\/ stopTTS\\(\\); \\/\\/ Disable narration - assuming stopTTS is defined elsewhere/g, 'if (typeof stopTTS === "function") stopTTS(); // Disable narration');

fs.writeFileSync(bibleReaderFile, brCode, 'utf8');
console.log('Props patched in BibleReaderPage');
