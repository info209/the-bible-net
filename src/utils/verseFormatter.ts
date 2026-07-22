/**
 * Formats a Daily Verse object for copying to the clipboard.
 * 
 * Format:
 * "Verse text..."
 * 
 * Book Chapter:Verse(s) - Bible Version
 * 
 * Example (single verse):
 * "He that spared not his own Son, but delivered him up for us all, how shall he not with him also freely give us all things?"
 * Romans 8:32 - KJV
 * 
 * Example (multiple verses):
 * "16 For God so loved the world... 17 For God sent not..."
 * John 3:16-17 - KJV
 */
export function formatCopyVerseText(content: any): string {
    if (!content) return '';

    let verseText = '';

    let verseItems: Array<{ number: number; text: string }> = content?.verseItems || [];
    if (verseItems.length === 0 && content?.verseBlocks && Array.isArray(content.verseBlocks)) {
        verseItems = content.verseBlocks.flatMap((b: any) => b.verses || []);
    }

    if (verseItems.length > 1) {
        verseText = verseItems.map(v => `${v.number} ${v.text}`).join(' ');
    } else if (verseItems.length === 1) {
        verseText = verseItems[0].text;
    } else {
        verseText = content?.verse || '';
    }

    const reference = content?.verseReference || '';
    const version = content?.version || 'KJV';

    if (reference) {
        return `"${verseText}"\n\n${reference} - ${version}`;
    }
    return `"${verseText}"`;
}
