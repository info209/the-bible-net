const fs = require('fs');
let lines = fs.readFileSync('src/app/components/BibleReaderPage.tsx', 'utf8').split(/\r?\n/);
const startLineIdx = lines.findIndex((l) => l.includes('const totalChapters = bookChapters'));
const endLineIdx = lines.findIndex((l, i) => i > startLineIdx && l.includes('readNextVerse'));

if (startLineIdx >= 0 && endLineIdx >= 0) {
  const replacementLines = `      const totalChapters = bookChapters[displayBookName] || 50;
      const currentBookIndex = allBooks.findIndex((b) => b.id === selectedBookId);

      let nextBookObj = allBooks[currentBookIndex] || { id: selectedBookId, name: displayBookName };
      let nextChapter = selectedChapter;

      if (selectedChapter < totalChapters) {
        // Move to next chapter in same book
        nextChapter = selectedChapter + 1;
      } else if (currentBookIndex < allBooks.length - 1) {
        // Move to first chapter of next book
        nextBookObj = allBooks[currentBookIndex + 1];
        nextChapter = 1;
      } else {
        // Reached the end of the Bible
        console.log('Reached the end of the Bible');
        setNarrationPlaying(false);
        narrationPlayingRef.current = false;
        setCurrentReadingVerse(null);
        setAudioPlaying(false);
        return;
      }

      console.log('Auto-continuing to next chapter:', nextBookObj.name, nextChapter);

      // Set progress to 100% before moving to next chapter
      setAudioCurrentTime(audioDuration);

      console.log('[Auto-Advance] Starting auto-advance to next chapter');
      console.log('[Auto-Advance] Current states - audioPlaying:', audioPlaying, 'narrationPlaying:', narrationPlayingRef.current);
      console.log('[Auto-Advance] Current chapter:', selectedBookId, selectedChapter, '-> Next chapter:', nextBookObj.name, nextChapter);

      // Set flag to indicate this is an auto-advance, not manual navigation
      isAutoAdvancingRef.current = true;

      // Fetch verses for the next chapter using the nextBookObj/nextChapter variables
      // (not getBibleContent() which uses state that hasn't updated yet)
      let bibleData = mockBibleContent;
      if (selectedVersionId === 'TEL' || selectedVersionId === 'TELBSI') {
        bibleData = teluguBible;
      } else if (selectedVersionId === 'HIN' || selectedVersionId === 'HINBSI') {
        bibleData = hindiBible;
      }
      const nextChapterVerses = bibleData[nextBookObj.name]?.[nextChapter]?.verses || [];

      console.log('Auto-advance: Fetched', nextChapterVerses.length, 'verses for', nextBookObj.name, nextChapter);

      if (nextChapterVerses.length === 0) {
        console.log('No verses found for next chapter, stopping');
        setNarrationPlaying(false);
        narrationPlayingRef.current = false;
        setCurrentReadingVerse(null);
        setAudioPlaying(false);
        isAutoAdvancingRef.current = false;
        return;
      }

      console.log('[Auto-Advance] Updating state to next chapter:', nextBookObj.name, nextChapter);

      // Update the book and chapter state
      setSelectedBookId(nextBookObj.id);
      setDisplayBookName(nextBookObj.name);
      setSelectedChapter(nextChapter);
      setSelectedVerse(1); // Reset to verse 1 for the new chapter

      // Small delay to allow state to update and new chapter to load
      setTimeout(() => {
        console.log('[Auto-Advance] Timeout fired - starting narration of new chapter');
        console.log('[Auto-Advance] State should now be:', nextBookObj.name, nextChapter);
        console.log('[Auto-Advance] States before readNextVerse - audioPlaying:', audioPlaying, 'narrationPlaying:', narrationPlayingRef.current);

        // Make sure narration is still supposed to be playing
        if (!narrationPlayingRef.current) {
          console.log('[Auto-Advance] Narration was stopped during chapter transition, aborting');
          isAutoAdvancingRef.current = false;
          return;
        }

        narrationVerseIndexRef.current = 0;
        console.log('[Auto-Advance] Calling readNextVerse with', nextChapterVerses.length, 'verses');
        readNextVerse(nextChapterVerses, 0);`.split('\n');
  
  lines.splice(startLineIdx, endLineIdx - startLineIdx + 1, ...replacementLines);
  fs.writeFileSync('src/app/components/BibleReaderPage.tsx', lines.join('\n'));
  console.log('Replaced lines ' + startLineIdx + ' to ' + endLineIdx);
} else {
  console.log('Could not find start or end line', startLineIdx, endLineIdx);
}
