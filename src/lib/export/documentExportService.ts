'use client';

import { toast } from '@/context/ToastContext';
import { format } from 'date-fns';
import type { Paragraph, TextRun } from 'docx';

export interface DocumentExportData {
  title?: string;
  type: 'journal' | 'prayer';
  contentHtml: string;
  labels?: string[];
  verses?: Array<{
    bookName: string;
    chapter: number;
    verses: number[];
    version?: string;
    label?: string;
  }>;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  status?: string; // e.g. 'active' | 'prayed' | 'answered'
  isPinned?: boolean;
}

/**
 * Sanitizes a document title for safe cross-platform filenames.
 * Handles Unicode, spaces, and removes illegal filesystem characters.
 */
export function sanitizeFilename(title: string | undefined, fallbackPrefix: string): string {
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  if (!title || !title.trim()) {
    return `${fallbackPrefix}_${dateStr}`;
  }
  
  // Remove illegal characters: \ / : * ? " < > | and control characters
  const cleaned = title
    .replace(/[\\/:*?"<>|\x00-\x1F\x7F]+/g, '')
    .trim()
    .replace(/\s+/g, '_');

  return cleaned || `${fallbackPrefix}_${dateStr}`;
}

/**
 * Formats a date safely into a readable presentation string.
 */
function formatDocumentDate(dateVal?: string | Date): string {
  if (!dateVal) return format(new Date(), 'MMMM d, yyyy');
  try {
    const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
    if (isNaN(d.getTime())) return format(new Date(), 'MMMM d, yyyy');
    return format(d, 'MMMM d, yyyy');
  } catch {
    return format(new Date(), 'MMMM d, yyyy');
  }
}

/**
 * Extracts clean plain-text preview from HTML for sharing and meta descriptions.
 */
function extractPlainText(html: string): string {
  if (typeof window === 'undefined') return '';
  const div = document.createElement('div');
  div.innerHTML = html || '';
  return (div.textContent || div.innerText || '').trim();
}

/**
 * Native Web Share API integration with automatic fallback to clipboard copy.
 */
export async function shareDocument(data: DocumentExportData): Promise<void> {
  const title = (data.title || (data.type === 'journal' ? 'Journal Entry' : 'Prayer Request')).trim();
  const plainText = extractPlainText(data.contentHtml);
  const typeLabel = data.type === 'journal' ? 'Journal' : 'Prayer';
  const dateStr = formatDocumentDate(data.createdAt || data.updatedAt);
  
  let shareText = `${typeLabel}: "${title}"\nDate: ${dateStr}`;
  
  if (data.labels && data.labels.length > 0) {
    shareText += `\nLabels: ${data.labels.join(', ')}`;
  }
  
  if (data.verses && data.verses.length > 0) {
    const versesStr = data.verses.map(v => `${v.bookName} ${v.chapter}:${v.verses.join(', ')}`).join('; ');
    shareText += `\nScriptures: ${versesStr}`;
  }

  if (plainText) {
    // Truncate preview if very long for system share dialogs
    const excerpt = plainText.length > 300 ? `${plainText.substring(0, 300)}...` : plainText;
    shareText += `\n\n${excerpt}`;
  }

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title,
        text: shareText,
        url: shareUrl,
      });
      toast.success('Document shared successfully');
      return;
    } catch (err: any) {
      if (err.name === 'AbortError') return; // User cancelled share sheet
      // Fall through to clipboard copy
    }
  }

  // Fallback to clipboard copy
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
      toast.success('Copied document details to clipboard');
    } catch (err) {
      toast.error('Could not copy to clipboard');
    }
  } else {
    toast.error('Sharing is not supported on this browser');
  }
}

/**
 * Builds off-screen high-resolution print container and generates a crisp multi-page PDF.
 * Flawlessly handles all Unicode scripts (Telugu, Hindi, English, Greek, Hebrew, etc.)
 */
export async function exportDocumentAsPdf(data: DocumentExportData): Promise<void> {
  if (typeof window === 'undefined') return;

  const fallbackPrefix = data.type === 'journal' ? 'Journal' : 'Prayer';
  const filename = `${sanitizeFilename(data.title, fallbackPrefix)}.pdf`;
  const formattedDate = formatDocumentDate(data.createdAt || data.updatedAt);
  const typeDisplay = data.type === 'journal' ? 'JOURNAL ENTRY' : 'PRAYER REQUEST';
  const statusDisplay = data.status === 'prayed' || data.status === 'answered' ? 'Answered / Prayed' : null;

  // Create isolated container for rendering
  const container = document.createElement('div');
  container.className = 'bible-net-pdf-export-root';
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '794px'; // Standard A4 width at 96 DPI
  container.style.minHeight = '1123px'; // Standard A4 height
  container.style.backgroundColor = '#FFFFFF';
  container.style.color = '#1E293B';
  container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  container.style.padding = '48px 44px';
  container.style.boxSizing = 'border-box';
  container.style.zIndex = '-9999';

  // Build Document HTML with typography and branding
  container.innerHTML = `
    <style>
      .pdf-brand-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 2px solid #0B7A81;
        padding-bottom: 12px;
        margin-bottom: 24px;
      }
      .pdf-brand-title {
        font-size: 16px;
        font-weight: 800;
        color: #0B7A81;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }
      .pdf-type-badge {
        display: inline-block;
        padding: 4px 12px;
        background-color: #E8F6F6;
        color: #0B7A81;
        font-size: 11px;
        font-weight: 700;
        border-radius: 9999px;
        letter-spacing: 0.05em;
      }
      .pdf-status-badge {
        display: inline-block;
        padding: 3px 10px;
        background-color: #ECFDF5;
        color: #059669;
        font-size: 11px;
        font-weight: 700;
        border-radius: 9999px;
        margin-left: 8px;
      }
      .pdf-doc-title {
        font-size: 26px;
        font-weight: 800;
        color: #0F172A;
        line-height: 1.3;
        margin: 0 0 10px 0;
      }
      .pdf-meta-row {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 12px;
        font-size: 12.5px;
        color: #64748B;
        margin-bottom: 20px;
      }
      .pdf-labels-list {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 24px;
      }
      .pdf-label-chip {
        display: inline-block;
        padding: 3px 10px;
        background-color: #F1F5F9;
        color: #334155;
        border: 1px solid #E2E8F0;
        font-size: 11px;
        font-weight: 600;
        border-radius: 6px;
      }
      .pdf-content-body {
        font-size: 15px;
        line-height: 1.75;
        color: #334155;
      }
      .pdf-content-body h1 {
        font-size: 22px;
        font-weight: 700;
        color: #0F172A;
        margin: 22px 0 10px 0;
      }
      .pdf-content-body h2 {
        font-size: 18px;
        font-weight: 700;
        color: #1E293B;
        margin: 18px 0 8px 0;
      }
      .pdf-content-body h3 {
        font-size: 16px;
        font-weight: 600;
        color: #334155;
        margin: 14px 0 6px 0;
      }
      .pdf-content-body p {
        margin: 0 0 14px 0;
      }
      .pdf-content-body ul {
        list-style-type: disc;
        margin: 8px 0 14px 24px;
        padding: 0;
      }
      .pdf-content-body ol {
        list-style-type: decimal;
        margin: 8px 0 14px 24px;
        padding: 0;
      }
      .pdf-content-body li {
        margin-bottom: 5px;
      }
      .pdf-content-body blockquote {
        border-left: 4px solid #0B7A81;
        background-color: #F8FAFC;
        padding: 10px 16px;
        margin: 16px 0;
        color: #475569;
        font-style: italic;
        border-radius: 0 8px 8px 0;
      }
      .pdf-content-body mark {
        background-color: #FEF08A;
        padding: 1px 4px;
        border-radius: 3px;
      }
      .pdf-content-body u {
        text-decoration: underline;
      }
      .pdf-content-body s, .pdf-content-body del {
        text-decoration: line-through;
      }
      .pdf-content-body .verse-block-card,
      .pdf-content-body [data-type="verse-block"],
      .pdf-content-body [data-verse-block] {
        margin: 18px 0 !important;
        padding: 14px 18px !important;
        background-color: #F0F9FA !important;
        border-left: 4px solid #0B7A81 !important;
        border-radius: 0 10px 10px 0 !important;
        box-shadow: none !important;
      }
      .pdf-content-body .verse-quote-text {
        font-family: Georgia, Cambria, "Times New Roman", Times, serif !important;
        font-style: italic !important;
        color: #1E293B !important;
        font-size: 14.5px !important;
        line-height: 1.6 !important;
        margin-bottom: 6px !important;
      }
      .pdf-content-body .verse-ref-label {
        font-weight: 700 !important;
        color: #0B7A81 !important;
        font-size: 13px !important;
        letter-spacing: 0.02em !important;
        margin-top: 4px !important;
      }
      .pdf-content-body .verse-link,
      .pdf-content-body a[data-verse-book] {
        color: #0B7A81 !important;
        font-weight: 600 !important;
        text-decoration: underline !important;
      }
      .pdf-linked-verses-box {
        margin-top: 32px;
        padding-top: 18px;
        border-top: 1px solid #E2E8F0;
      }
      .pdf-linked-verses-title {
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #64748B;
        margin-bottom: 10px;
      }
      .pdf-linked-verse-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        color: #0B7A81;
        font-weight: 600;
        margin-bottom: 6px;
      }
      .pdf-footer-bar {
        margin-top: 48px;
        padding-top: 14px;
        border-top: 1px solid #E2E8F0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 11px;
        color: #94A3B8;
      }
    </style>

    <div class="pdf-brand-bar">
      <div class="pdf-brand-title">The Bible Net</div>
      <div style="display: flex; align-items: center;">
        <span class="pdf-type-badge">${typeDisplay}</span>
        ${statusDisplay ? `<span class="pdf-status-badge">✓ ${statusDisplay}</span>` : ''}
      </div>
    </div>

    <h1 class="pdf-doc-title">${(data.title || 'Untitled').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</h1>
    
    <div class="pdf-meta-row">
      <span>Date: <strong>${formattedDate}</strong></span>
    </div>

    ${data.labels && data.labels.length > 0 ? `
      <div class="pdf-labels-list">
        ${data.labels.map(l => `<span class="pdf-label-chip">${l}</span>`).join('')}
      </div>
    ` : ''}

    <div class="pdf-content-body">
      ${data.contentHtml || '<p style="color: #94A3B8; font-style: italic;">No content provided.</p>'}
    </div>

    ${data.verses && data.verses.length > 0 ? `
      <div class="pdf-linked-verses-box">
        <div class="pdf-linked-verses-title">Linked Scripture References</div>
        ${data.verses.map(v => `
          <div class="pdf-linked-verse-item">
            <span>📖</span>
            <span>${v.bookName} ${v.chapter}:${v.verses.join(', ')} ${v.version ? `(${v.version})` : ''}</span>
          </div>
        `).join('')}
      </div>
    ` : ''}

    <div class="pdf-footer-bar">
      <span>The Bible Net • Saved from the-bible.net</span>
      <span>${format(new Date(), 'yyyy-MM-dd HH:mm')}</span>
    </div>
  `;

  document.body.appendChild(container);

  try {
    // Dynamic import to prevent SSR build issues
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf')
    ]);

    // Render high-DPI canvas
    const canvas = await html2canvas(container, {
      scale: 2, // 2x Retina scale for crisp 200+ DPI vector-quality print
      useCORS: true,
      logging: false,
      backgroundColor: '#FFFFFF',
    });

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const imgWidth = 210; // A4 width in mm
    const pageHeightMm = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    // First page
    const pageCanvas = document.createElement('canvas');
    const ctx = pageCanvas.getContext('2d');
    
    // Calculate pixels per mm on canvas
    const pxPerMm = canvas.width / imgWidth;
    const pageCanvasHeight = pageHeightMm * pxPerMm;

    pageCanvas.width = canvas.width;
    pageCanvas.height = Math.min(canvas.height, pageCanvasHeight);

    if (ctx) {
      ctx.drawImage(canvas, 0, 0, canvas.width, pageCanvas.height, 0, 0, canvas.width, pageCanvas.height);
      const imgData = pageCanvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, (pageCanvas.height * imgWidth) / canvas.width);
    }

    heightLeft -= pageHeightMm;

    // Remaining pages
    let pageIndex = 1;
    while (heightLeft > 0) {
      position = pageIndex * pageCanvasHeight;
      const currentPageHeight = Math.min(canvas.height - position, pageCanvasHeight);

      if (currentPageHeight <= 0) break;

      pageCanvas.height = currentPageHeight;
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(canvas, 0, position, canvas.width, currentPageHeight, 0, 0, canvas.width, currentPageHeight);
        const imgData = pageCanvas.toDataURL('image/jpeg', 0.95);
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, (currentPageHeight * imgWidth) / canvas.width);
      }

      heightLeft -= pageHeightMm;
      pageIndex++;
    }

    pdf.save(filename);
    toast.success('PDF downloaded successfully');
  } catch (err) {
    console.error('Failed to generate PDF document:', err);
    toast.error('Failed to download PDF. Please try again.');
    throw err;
  } finally {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}

/**
 * Generates and downloads a clean, beautifully formatted Microsoft Word (.docx) document.
 */
export async function exportDocumentAsDocx(data: DocumentExportData): Promise<void> {
  if (typeof window === 'undefined') return;

  const fallbackPrefix = data.type === 'journal' ? 'Journal' : 'Prayer';
  const filename = `${sanitizeFilename(data.title, fallbackPrefix)}.docx`;
  const formattedDate = formatDocumentDate(data.createdAt || data.updatedAt);
  const typeDisplay = data.type === 'journal' ? 'Journal Entry' : 'Prayer Request';
  const statusDisplay = data.status === 'prayed' || data.status === 'answered' ? 'Answered / Prayed' : null;

  try {
    const docxModule = await import('docx');
    const {
      Document,
      Packer,
      Paragraph,
      TextRun,
      HeadingLevel,
      AlignmentType,
      BorderStyle,
      Header,
      Footer,
      PageNumber,
      convertInchesToTwip,
      UnderlineType,
    } = docxModule;

    // Helper: Parse inline HTML marks recursively into TextRun objects
    function parseInlineNodes(element: Node, inheritedMarks: {
      bold?: boolean;
      italics?: boolean;
      underline?: boolean;
      strike?: boolean;
      color?: string;
      highlight?: "yellow" | "green" | "cyan" | "magenta" | "blue" | "red" | "darkBlue" | "darkCyan" | "darkGreen" | "darkMagenta" | "darkRed" | "darkYellow" | "darkGray" | "lightGray" | "black" | "white" | "none";
    } = {}): TextRun[] {
      const runs: TextRun[] = [];

      element.childNodes.forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const text = child.nodeValue || '';
          if (text) {
            runs.push(
              new TextRun({
                text,
                bold: inheritedMarks.bold,
                italics: inheritedMarks.italics,
                underline: inheritedMarks.underline ? { type: UnderlineType.SINGLE } : undefined,
                strike: inheritedMarks.strike,
                color: inheritedMarks.color || '1E293B',
                highlight: inheritedMarks.highlight,
                font: 'Calibri',
                size: 23, // 11.5pt
              })
            );
          }
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          const el = child as HTMLElement;
          const tagName = el.tagName.toUpperCase();

          const currentMarks = { ...inheritedMarks };

          if (tagName === 'STRONG' || tagName === 'B') currentMarks.bold = true;
          if (tagName === 'EM' || tagName === 'I') currentMarks.italics = true;
          if (tagName === 'U') currentMarks.underline = true;
          if (tagName === 'S' || tagName === 'DEL' || tagName === 'STRIKE') currentMarks.strike = true;
          if (tagName === 'MARK') currentMarks.highlight = 'yellow';

          if (el.hasAttribute('data-verse-link') || el.classList.contains('verse-link') || el.hasAttribute('data-verse-book')) {
            currentMarks.bold = true;
            currentMarks.color = '0B7A81';
            currentMarks.underline = true;
          }

          if (el.style.color) {
            const colorHex = rgbOrNamedToHex(el.style.color);
            if (colorHex) currentMarks.color = colorHex;
          }

          if (tagName === 'BR') {
            runs.push(new TextRun({ break: 1 }));
          } else {
            runs.push(...parseInlineNodes(el, currentMarks));
          }
        }
      });

      return runs;
    }

    // Helper: Convert RGB or Color string to 6-char hex
    function rgbOrNamedToHex(color: string): string | null {
      if (!color) return null;
      if (color.startsWith('#')) return color.replace('#', '').slice(0, 6);
      const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (match) {
        const r = parseInt(match[1]).toString(16).padStart(2, '0');
        const g = parseInt(match[2]).toString(16).padStart(2, '0');
        const b = parseInt(match[3]).toString(16).padStart(2, '0');
        return `${r}${g}${b}`;
      }
      return null;
    }

    // Helper: Determine alignment from style attribute
    function getAlignment(el: HTMLElement): typeof AlignmentType[keyof typeof AlignmentType] {
      const align = el.style.textAlign || el.getAttribute('align') || '';
      if (align === 'center') return AlignmentType.CENTER;
      if (align === 'right') return AlignmentType.RIGHT;
      if (align === 'justify') return AlignmentType.JUSTIFIED;
      return AlignmentType.LEFT;
    }

    // Parse HTML into DOCX Paragraphs
    const parser = new DOMParser();
    const docDom = parser.parseFromString(data.contentHtml || '', 'text/html');
    const bodyChildren = Array.from(docDom.body.childNodes);

    const contentParagraphs: Paragraph[] = [];

    bodyChildren.forEach((childNode) => {
      if (childNode.nodeType === Node.TEXT_NODE) {
        const text = childNode.nodeValue?.trim();
        if (text) {
          contentParagraphs.push(
            new Paragraph({
              children: [new TextRun({ text, font: 'Calibri', size: 23, color: '1E293B' })],
              spacing: { after: 140, line: 276 },
            })
          );
        }
        return;
      }

      if (childNode.nodeType !== Node.ELEMENT_NODE) return;
      const el = childNode as HTMLElement;
      const tag = el.tagName.toUpperCase();

      // Headings
      if (tag === 'H1') {
        contentParagraphs.push(
          new Paragraph({
            text: el.textContent || '',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 240, after: 120 },
          })
        );
      } else if (tag === 'H2') {
        contentParagraphs.push(
          new Paragraph({
            text: el.textContent || '',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 },
          })
        );
      } else if (tag === 'H3') {
        contentParagraphs.push(
          new Paragraph({
            text: el.textContent || '',
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 160, after: 80 },
          })
        );
      }
      // Lists
      else if (tag === 'UL') {
        el.querySelectorAll('li').forEach((li) => {
          contentParagraphs.push(
            new Paragraph({
              children: parseInlineNodes(li),
              bullet: { level: 0 },
              spacing: { after: 80, line: 260 },
            })
          );
        });
      } else if (tag === 'OL') {
        let index = 1;
        el.querySelectorAll('li').forEach((li) => {
          contentParagraphs.push(
            new Paragraph({
              children: [
                new TextRun({ text: `${index}. `, bold: true, color: '0B7A81' }),
                ...parseInlineNodes(li),
              ],
              indent: { left: convertInchesToTwip(0.25) },
              spacing: { after: 80, line: 260 },
            })
          );
          index++;
        });
      }
      // Blockquote
      else if (tag === 'BLOCKQUOTE') {
        contentParagraphs.push(
          new Paragraph({
            children: parseInlineNodes(el, { italics: true, color: '475569' }),
            indent: { left: convertInchesToTwip(0.4) },
            border: {
              left: {
                color: '0B7A81',
                size: 24, // 3pt
                style: BorderStyle.SINGLE,
                space: 10,
              },
            },
            spacing: { before: 140, after: 160, line: 276 },
          })
        );
      }
      // Bible Verse Block
      else if (
        el.getAttribute('data-type') === 'verse-block' ||
        el.hasAttribute('data-verse-block') ||
        el.classList.contains('verse-block-card')
      ) {
        const rawQuote = el.querySelector('.verse-quote-text')?.textContent || el.getAttribute('data-verse-quote') || el.textContent || '';
        const rawLabel = el.querySelector('.verse-ref-label')?.textContent || el.getAttribute('data-verse-label') || '';
        const cleanQuote = rawQuote.replace(/^["'\s]+|["'\s]+$/g, '');

        contentParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `"${cleanQuote}"`,
                italics: true,
                font: 'Georgia',
                size: 22,
                color: '1E293B',
              }),
            ],
            indent: { left: convertInchesToTwip(0.3) },
            border: {
              left: {
                color: '0B7A81',
                size: 24,
                style: BorderStyle.SINGLE,
                space: 12,
              },
            },
            shading: {
              fill: 'F0F9FA',
            },
            spacing: { before: 160, after: 60, line: 276 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: rawLabel.startsWith('—') ? rawLabel : `— ${rawLabel}`,
                bold: true,
                font: 'Calibri',
                size: 20,
                color: '0B7A81',
              }),
            ],
            indent: { left: convertInchesToTwip(0.3) },
            border: {
              left: {
                color: '0B7A81',
                size: 24,
                style: BorderStyle.SINGLE,
                space: 12,
              },
            },
            shading: {
              fill: 'F0F9FA',
            },
            spacing: { before: 0, after: 160 },
          })
        );
      }
      // Standard Paragraph
      else {
        const inlineRuns = parseInlineNodes(el);
        if (inlineRuns.length > 0) {
          contentParagraphs.push(
            new Paragraph({
              children: inlineRuns,
              alignment: getAlignment(el),
              spacing: { after: 140, line: 276 },
            })
          );
        }
      }
    });

    // Linked scripture references section in DOCX
    const linkedScriptureParagraphs: Paragraph[] = [];
    if (data.verses && data.verses.length > 0) {
      linkedScriptureParagraphs.push(
        new Paragraph({
          text: 'Linked Scripture References',
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 300, after: 100 },
        })
      );
      data.verses.forEach((v) => {
        linkedScriptureParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({ text: '• ', bold: true, color: '0B7A81' }),
              new TextRun({
                text: `${v.bookName} ${v.chapter}:${v.verses.join(', ')} ${v.version ? `(${v.version})` : ''}`,
                bold: true,
                color: '0B7A81',
              }),
            ],
            spacing: { after: 60 },
          })
        );
      });
    }

    // Build the full Document
    const doc = new Document({
      title: data.title || typeDisplay,
      description: `Exported ${typeDisplay} from The Bible Net`,
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: convertInchesToTwip(1),
                right: convertInchesToTwip(1),
                bottom: convertInchesToTwip(1),
                left: convertInchesToTwip(1),
              },
            },
          },
          headers: {
            default: new Header({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'The Bible Net',
                      bold: true,
                      size: 18,
                      color: '0B7A81',
                    }),
                    new TextRun({
                      text: `  |  ${typeDisplay}`,
                      size: 18,
                      color: '94A3B8',
                    }),
                  ],
                  alignment: AlignmentType.RIGHT,
                }),
              ],
            }),
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'The Bible Net • https://the-bible.net    ',
                      size: 18,
                      color: '94A3B8',
                    }),
                    new TextRun({
                      text: 'Page ',
                      size: 18,
                      color: '94A3B8',
                    }),
                    new TextRun({
                      children: [PageNumber.CURRENT],
                      size: 18,
                      color: '94A3B8',
                    }),
                    new TextRun({
                      text: ' of ',
                      size: 18,
                      color: '94A3B8',
                    }),
                    new TextRun({
                      children: [PageNumber.TOTAL_PAGES],
                      size: 18,
                      color: '94A3B8',
                    }),
                  ],
                  alignment: AlignmentType.RIGHT,
                }),
              ],
            }),
          },
          children: [
            // Document Title
            new Paragraph({
              text: data.title || 'Untitled',
              heading: HeadingLevel.TITLE,
              spacing: { after: 120 },
            }),

            // Metadata Row: Type, Date, Status
            new Paragraph({
              children: [
                new TextRun({ text: 'Type: ', bold: true, color: '64748B', size: 20 }),
                new TextRun({ text: `${typeDisplay}    `, color: '0B7A81', bold: true, size: 20 }),
                new TextRun({ text: 'Date: ', bold: true, color: '64748B', size: 20 }),
                new TextRun({ text: `${formattedDate}    `, color: '334155', size: 20 }),
                ...(statusDisplay ? [
                  new TextRun({ text: 'Status: ', bold: true, color: '64748B', size: 20 }),
                  new TextRun({ text: `✓ ${statusDisplay}`, bold: true, color: '059669', size: 20 }),
                ] : []),
              ],
              spacing: { after: data.labels && data.labels.length > 0 ? 80 : 160 },
            }),

            // Labels Row
            ...(data.labels && data.labels.length > 0 ? [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Labels: ', bold: true, color: '64748B', size: 20 }),
                  new TextRun({ text: data.labels.join(', '), color: '0B7A81', size: 20 }),
                ],
                spacing: { after: 200 },
              }),
            ] : []),

            // Content Body Paragraphs
            ...contentParagraphs,

            // Attached Scriptures
            ...linkedScriptureParagraphs,
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    
    // Trigger download
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Word document (.docx) downloaded successfully');
  } catch (err) {
    console.error('Failed to generate Word document:', err);
    toast.error('Failed to download Word document. Please try again.');
    throw err;
  }
}
