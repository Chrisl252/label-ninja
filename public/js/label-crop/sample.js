// "Try a sample label": builds a fake letter-size label PDF in the browser so a first-time
// visitor can see the converter work without their own file. Everything on it is marked
// SAMPLE ONLY: placeholder addresses, no real tracking number, no postage, a decorative
// (non-standard) bar pattern. pdf-lib is injected so Node tests share this file.

import { layoutCells } from './layouts.js';

const LETTER = { w: 612, h: 792 };
const BARS = [3, 1, 1, 2, 1, 3, 2, 1, 1, 1, 3, 1, 2, 2, 1, 1, 3, 1, 1, 2, 2, 1, 1, 3, 1, 1, 2, 1, 3, 1, 1, 2];

function drawBars(page, rgb, x, y, w, h) {
  const total = BARS.reduce((a, b) => a + b, 0) * 2;
  const unit = w / total;
  let cx = x;
  BARS.concat(BARS).forEach((bw, i) => {
    if (i % 2 === 0) page.drawRectangle({ x: cx, y, width: bw * unit, height: h, color: rgb(0, 0, 0) });
    cx += bw * unit;
  });
}

/** One fake label inside box b (PDF points, bottom-left origin). */
function drawLabel(page, PDFLib, fonts, b, n) {
  const { rgb } = PDFLib;
  const u = Math.min(b.w, b.h) / 288;
  const pad = 12 * u;
  const left = b.x + pad;
  let top = b.y + b.h - pad;
  const text = (s, size, font = fonts.regular) => { top -= size * 1.25; page.drawText(s, { x: left, y: top, size, font, color: rgb(0, 0, 0) }); };
  page.drawRectangle({ x: b.x, y: b.y, width: b.w, height: b.h, borderWidth: 2.5, borderColor: rgb(0, 0, 0) });
  text('SAMPLE ONLY - NOT A REAL LABEL', 12 * u, fonts.bold);
  top -= 5 * u;
  page.drawLine({ start: { x: b.x, y: top }, end: { x: b.x + b.w, y: top }, thickness: 1.5, color: rgb(0, 0, 0) });
  top -= 4 * u;
  for (const line of ['FROM: SAMPLE SENDER', '100 EXAMPLE ST', 'ANYTOWN ST 00000']) text(line, 7 * u);
  top -= 8 * u;
  text('SHIP TO:', 8 * u, fonts.bold);
  for (const line of [`SAMPLE RECIPIENT ${n}`, '200 PLACEHOLDER AVE', 'SAMPLEVILLE ST 00000']) text(line, 11 * u, fonts.bold);
  const barH = Math.min(52 * u, top - b.y - 30 * u);
  drawBars(page, rgb, b.x + 18 * u, b.y + 22 * u, b.w - 36 * u, Math.max(10, barH));
  page.drawText('NO TRACKING NUMBER - DEMO PATTERN, NOT A BARCODE', { x: left, y: b.y + 9 * u, size: 6.5 * u, font: fonts.regular, color: rgb(0, 0, 0) });
}

function drawSlip(page, PDFLib, fonts, b) {
  const { rgb } = PDFLib;
  let top = b.y + b.h;
  const text = (s, size, font = fonts.regular, x = b.x) => { top -= size * 1.5; page.drawText(s, { x, y: top, size, font, color: rgb(0, 0, 0) }); };
  text('PACKING SLIP (SAMPLE ONLY)', 16, fonts.bold);
  text('Order SAMPLE-0001   Ship to: Sample Recipient 1', 10);
  top -= 6;
  page.drawLine({ start: { x: b.x, y: top }, end: { x: b.x + b.w, y: top }, thickness: 1, color: rgb(0, 0, 0) });
  for (const [item, qty] of [['Sample item A (placeholder)', 1], ['Sample item B (placeholder)', 2], ['Sample item C (placeholder)', 1]]) {
    text(item, 10);
    page.drawText(`Qty ${qty}`, { x: b.x + b.w - 50, y: top, size: 10, font: fonts.regular, color: rgb(0, 0, 0) });
  }
  top -= 6;
  page.drawLine({ start: { x: b.x, y: top }, end: { x: b.x + b.w, y: top }, thickness: 1, color: rgb(0, 0, 0) });
  text('Thank you for your order. This page is a demo made by Label Ninja.', 9);
}

/** Fit a 3:2 label (landscape in wide cells, portrait in tall ones) inside a cell. */
function labelBox(cell, margin) {
  const cw = cell.w - 2 * margin, ch = cell.h - 2 * margin;
  const [aw, ah] = cell.w >= cell.h ? [3, 2] : [2, 3];
  const s = Math.min(cw / aw, ch / ah);
  return { x: cell.x + (cell.w - aw * s) / 2, y: cell.y + (cell.h - ah * s) / 2, w: aw * s, h: ah * s };
}

/**
 * Build a one-page letter PDF. layout 'single' = one 6x4 label in the top half and a packing
 * slip below; 'two-stack' | 'two-side' | 'four' = that many labels on the sheet.
 */
export async function buildSamplePdf(PDFLib, { layout = 'single' } = {}) {
  const doc = await PDFLib.PDFDocument.create();
  doc.setTitle('Label Ninja sample label (not a real label)');
  doc.setCreator('Label Ninja sample generator');
  const fonts = {
    regular: await doc.embedFont(PDFLib.StandardFonts.Helvetica),
    bold: await doc.embedFont(PDFLib.StandardFonts.HelveticaBold),
  };
  const page = doc.addPage([LETTER.w, LETTER.h]);
  if (layout === 'single' || !layout) {
    drawLabel(page, PDFLib, fonts, { x: 90, y: LETTER.h - 36 - 288, w: 432, h: 288 }, 1);
    page.drawLine({ start: { x: 36, y: LETTER.h / 2 }, end: { x: LETTER.w - 36, y: LETTER.h / 2 }, thickness: 0.75, dashArray: [6, 4], color: PDFLib.rgb(0, 0, 0) });
    drawSlip(page, PDFLib, fonts, { x: 72, y: 120, w: LETTER.w - 144, h: LETTER.h / 2 - 160 });
  } else {
    layoutCells(layout).forEach((c, i) => {
      const cell = { x: c.x * LETTER.w, y: (1 - c.y - c.h) * LETTER.h, w: c.w * LETTER.w, h: c.h * LETTER.h };
      drawLabel(page, PDFLib, fonts, labelBox(cell, 18), i + 1);
    });
  }
  return doc.save();
}

export const SAMPLE_FILE_NAME = 'sample-label-letter.pdf';
