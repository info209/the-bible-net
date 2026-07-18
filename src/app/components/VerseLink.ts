import { Mark, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { TELUGU_BOOK_NAMES, HINDI_BOOK_NAMES } from '@/utils/bibleBooks';

export const VerseLink = Mark.create({
  name: 'verseLink',

  inclusive: false,

  addAttributes() {
    return {
      book: {
        default: null,
      },
      chapter: {
        default: null,
      },
      startVerse: {
        default: null,
      },
      endVerse: {
        default: null,
      },
      version: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'a[data-verse-book]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'a',
      mergeAttributes(HTMLAttributes, {
        class: 'verse-link text-[#0B7A81] dark:text-[#14B8A6] hover:underline cursor-pointer font-medium transition-all duration-200',
        'data-verse-link': 'true',
        'data-verse-book': HTMLAttributes.book,
        'data-verse-chapter': HTMLAttributes.chapter,
        'data-verse-start': HTMLAttributes.startVerse,
        'data-verse-end': HTMLAttributes.endVerse,
        'data-verse-version': HTMLAttributes.version,
        href: '#',
      }),
      0,
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('verseLinkInvalidator'),
        appendTransaction(transactions, oldState, newState) {
          const docChanged = transactions.some(tr => tr.docChanged);
          if (!docChanged) return null;

          let tr = newState.tr;
          let modified = false;

          newState.doc.descendants((node, pos) => {
            if (!node.isText) return;

            const mark = node.marks.find(m => m.type.name === 'verseLink');
            if (!mark) return;

            const { book, chapter, startVerse, endVerse } = mark.attrs;
            if (!book || !chapter || !startVerse || !endVerse) return;

            // Generate the expected formatted references
            const englishRef = startVerse === endVerse 
              ? `${book} ${chapter}:${startVerse}`
              : `${book} ${chapter}:${startVerse}-${endVerse}`;

            const teluguBook = TELUGU_BOOK_NAMES[book] || book;
            const teluguRef = startVerse === endVerse 
              ? `${teluguBook} ${chapter}:${startVerse}`
              : `${teluguBook} ${chapter}:${startVerse}-${endVerse}`;

            const hindiBook = HINDI_BOOK_NAMES[book] || book;
            const hindiRef = startVerse === endVerse 
              ? `${hindiBook} ${chapter}:${startVerse}`
              : `${hindiBook} ${chapter}:${startVerse}-${endVerse}`;

            const actualText = node.text || '';

            const cleanText = (t: string) => t.replace(/–/g, '-').replace(/\s+/g, ' ').trim();
            const actualClean = cleanText(actualText);

            const textMatches = 
              actualClean === cleanText(englishRef) ||
              actualClean === cleanText(teluguRef) ||
              actualClean === cleanText(hindiRef);

            if (!textMatches) {
              const from = pos;
              const to = pos + node.nodeSize;
              tr = tr.removeMark(from, to, mark.type);
              modified = true;
            }
          });

          return modified ? tr : null;
        },
      }),
    ];
  },
});
