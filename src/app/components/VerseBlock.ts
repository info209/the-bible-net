import { Node, mergeAttributes } from '@tiptap/core';

export interface VerseBlockOptions {
  HTMLAttributes: Record<string, any>;
}

export const VerseBlock = Node.create<VerseBlockOptions>({
  name: 'verseBlock',

  group: 'block',

  atom: true,

  selectable: true,

  draggable: true,

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
        default: 'KJV',
      },
      quote: {
        default: '',
      },
      label: {
        default: '',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="verse-block"]',
      },
      {
        tag: 'div[data-verse-block]',
      },
      {
        tag: 'blockquote[data-verse-block]',
      },
      {
        tag: 'a[data-verse-book]',
        getAttrs: (dom) => {
          const el = dom as HTMLElement;
          const book = el.getAttribute('data-verse-book');
          const chapter = el.getAttribute('data-verse-chapter');
          const startVerse = el.getAttribute('data-verse-start');
          const endVerse = el.getAttribute('data-verse-end');
          const version = el.getAttribute('data-verse-version') || 'KJV';
          const label = el.textContent?.trim() || `${book} ${chapter}:${startVerse}`;
          return {
            book,
            chapter,
            startVerse: startVerse ? parseInt(startVerse, 10) : null,
            endVerse: endVerse ? parseInt(endVerse, 10) : null,
            version,
            label,
            quote: `"${label}"`,
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const rawQuote = HTMLAttributes.quote || `"${HTMLAttributes.label || ''}"`;
    const cleanQuote = rawQuote.replace(/^["'\s]+|["'\s]+$/g, '');
    const formattedQuote = `"${cleanQuote}"`;
    const label = HTMLAttributes.label || `${HTMLAttributes.book} ${HTMLAttributes.chapter}:${HTMLAttributes.startVerse}`;

    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'verse-block',
        'data-verse-block': 'true',
        'data-verse-book': HTMLAttributes.book,
        'data-verse-chapter': HTMLAttributes.chapter,
        'data-verse-start': HTMLAttributes.startVerse,
        'data-verse-end': HTMLAttributes.endVerse,
        'data-verse-version': HTMLAttributes.version,
        'data-verse-quote': rawQuote,
        'data-verse-label': label,
        class: 'verse-block-card my-3 p-4 bg-[#E8F6F6] dark:bg-[#0B7A81]/15 border-l-4 border-[#0B7A81] rounded-r-xl select-none cursor-pointer transition-all hover:bg-[#DFEFF0] dark:hover:bg-[#0B7A81]/25',
      }),
      [
        'p',
        { class: 'verse-quote-text italic text-gray-800 dark:text-gray-200 text-sm leading-relaxed mb-1.5 font-serif' },
        formattedQuote,
      ],
      [
        'p',
        { class: 'verse-ref-label font-bold text-gray-900 dark:text-gray-100 text-xs sm:text-sm tracking-wide' },
        `— ${label}`,
      ],
    ];
  },
});
