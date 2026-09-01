// Server-side label renderer — validated job spec -> pdf-lib PDFDocument -> Uint8Array.
// Pure vector output: text (standard fonts), CODE128 bars as rects, rects, lines, PNG/JPEG embeds.

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { encodeCode128 } from '../code128.js';

const IN = 72; // points per inch
const FONT_ASCENT = 0.75; // Helvetica ascent approximation for top-down y conversion
const LINE_HEIGHT = 1.2;

// WinAnsi-safe character whitelist (pdf-lib throws on unsupported glyphs in standard fonts).
const WINANSI_EXTRA = new Set(
  '\u20AC\u201A\u0192\u201E\u2020\u2021\u02C6\u2030\u0160\u2039\u0152\u017D\u2018\u2019\u201C\u201D\u2022\u2013\u2014\u02DC\u2122\u0161\u203A\u0153\u017E\u0178'.split('')
);

export function sanitizeText(text) {
  let out = '';
  for (const ch of String(text)) {
    const c = ch.codePointAt(0);
    if (ch === '\n') { out += ch; continue; }
    if ((c >= 32 && c <= 126) || (c >= 0xa0 && c <= 0xff) || WINANSI_EXTRA.has(ch)) out += ch;
    else out += '?';
  }
  return out;
}

function parseColor(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

function drawTextElement(page, el, fonts) {
  const size = el.font_size_pt;
  const font = el.bold ? fonts.bold : fonts.regular;
  const lines = sanitizeText(el.text).split('\n');
  const lineHeight = LINE_HEIGHT * size;
  const topPdfY = page.getHeight() - el.y_in * IN - FONT_ASCENT * size;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const w = font.widthOfTextAtSize(line, size);
    let x = el.x_in * IN;
    if (el.align === 'center') x += ((el.w_in || 0) * IN - w) / 2;
    else if (el.align === 'right') x += (el.w_in || 0) * IN - w;
    page.drawText(line, { x, y: topPdfY - i * lineHeight, size, font, color: parseColor(el.color || '#000000') });
  }
}

function drawBarcodeElement(page, el, fonts) {
  const { bars, totalModules } = encodeCode128(el.value);
  const boxX = el.x_in * IN;
  const boxW = el.w_in * IN;
  const boxH = el.h_in * IN;
  const boxTopPdfY = page.getHeight() - el.y_in * IN;
  const showText = el.show_text !== false;
  const fontSize = showText
    ? Math.max(3, Math.min(10, boxH * 0.2, boxW / Math.max(4, el.value.length * 0.6)))
    : 0;
  const textStrip = fontSize >= 3 ? fontSize * 1.35 : 0;
  const barH = Math.max(1, boxH - textStrip);
  const unit = boxW / totalModules;
  const barColor = parseColor(el.color || '#000000');
  let x = boxX;
  for (const b of bars) {
    if (b.bar) {
      page.drawRectangle({ x, y: boxTopPdfY - barH, width: b.width * unit, height: barH, color: barColor });
    }
    x += b.width * unit;
  }
  if (textStrip > 0) {
    const label = sanitizeText(el.value);
    const tw = fonts.regular.widthOfTextAtSize(label, fontSize);
    page.drawText(label, {
      x: boxX + (boxW - tw) / 2,
      y: boxTopPdfY - boxH + 1,
      size: fontSize,
      font: fonts.regular,
      color: barColor,
    });
  }
}

function drawRectElement(page, el) {
  const opts = {
    x: el.x_in * IN,
    y: page.getHeight() - (el.y_in + el.h_in) * IN,
    width: el.w_in * IN,
    height: el.h_in * IN,
  };
  if (el.fill) opts.color = parseColor(el.fill);
  if (el.stroke) {
    opts.borderColor = parseColor(el.stroke);
    opts.borderWidth = el.line_width_pt === undefined ? 1 : el.line_width_pt;
  }
  if (!el.fill && !el.stroke) {
    opts.borderColor = parseColor('#000000');
    opts.borderWidth = el.line_width_pt === undefined ? 1 : el.line_width_pt;
  }
  page.drawRectangle(opts);
}

function drawLineElement(page, el) {
  page.drawLine({
    start: { x: el.x1_in * IN, y: page.getHeight() - el.y1_in * IN },
    end: { x: el.x2_in * IN, y: page.getHeight() - el.y2_in * IN },
    thickness: el.line_width_pt === undefined ? 1 : el.line_width_pt,
    color: parseColor(el.color || '#000000'),
  });
}

async function drawImageElement(doc, page, el) {
  const raw = atob(el.data_base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  const img = el.mime === 'image/png' ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
  page.drawImage(img, {
    x: el.x_in * IN,
    y: page.getHeight() - (el.y_in + el.h_in) * IN,
    width: el.w_in * IN,
    height: el.h_in * IN,
  });
}

async function drawElement(doc, page, el, fonts) {
  switch (el.type) {
    case 'text': return drawTextElement(page, el, fonts);
    case 'barcode': return drawBarcodeElement(page, el, fonts);
    case 'rect': return drawRectElement(page, el);
    case 'line': return drawLineElement(page, el);
    case 'image': return drawImageElement(doc, page, el);
    default: throw new Error(`unknown element type: ${el.type}`);
  }
}

// spec: { pages: [{ width_in, height_in, elements: [...] }] } (already validated).
export async function renderSpecPdf(spec) {
  const doc = await PDFDocument.create();
  const fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };
  for (const p of spec.pages) {
    const page = doc.addPage([p.width_in * IN, p.height_in * IN]);
    page.setSize(p.width_in * IN, p.height_in * IN); // exact physical size from spec
    for (const el of p.elements) {
      await drawElement(doc, page, el, fonts);
    }
  }
  return doc.save();
}

// Built-in diagnostic generator: tool='test_print' with settings {width_in, height_in}.
export function buildTestPrintSpec(settings) {
  const w = settings.width_in;
  const h = settings.height_in;
  const landscape = w >= h;
  const inset = Math.min(0.15, w * 0.1, h * 0.1);
  const baseFont = Math.max(5, Math.min(14, Math.min(w, h) * IN * 0.09));
  const lineGap = baseFont * 1.5 / IN;
  const borderLw = Math.min(10, Math.min(w, h) * IN * 0.08);
  const markLen = Math.min(0.25, w * 0.2, h * 0.2);
  const cx = w / 2;

  const elements = [];
  let y = inset + borderLw / IN + 0.08;

  elements.push({ type: 'text', x_in: 0, y_in: y, w_in: w, text: 'LABEL NINJA TEST PRINT', font_size_pt: baseFont * 1.3, bold: true, align: 'center' });
  y += lineGap * 1.6;
  elements.push({ type: 'text', x_in: 0, y_in: y, w_in: w, text: new Date().toISOString().slice(0, 10), font_size_pt: baseFont, align: 'center' });
  y += lineGap * 1.3;
  elements.push({ type: 'text', x_in: 0, y_in: y, w_in: w, text: landscape ? 'LANDSCAPE' : 'PORTRAIT', font_size_pt: baseFont, bold: true, align: 'center' });
  y += lineGap * 1.5;

  const bcW = Math.min(2.2, Math.max(0.5, w - 2 * inset - 0.2));
  const bcH = Math.min(0.5, Math.max(0.12, h * 0.3));
  elements.push({ type: 'barcode', subtype: 'code128', value: 'TEST-12345', x_in: cx - bcW / 2, y_in: y, w_in: bcW, h_in: bcH, show_text: true });

  // 1-inch scale ruler with ticks every 1/8in, near the bottom, inside the border.
  const rulerW = Math.min(1, w - 2 * inset - 0.1);
  const rulerX = cx - rulerW / 2;
  const rulerY = Math.max(y + bcH + 0.05, h - inset - borderLw / IN - baseFont * 2.5 / IN);
  elements.push({ type: 'line', x1_in: rulerX, y1_in: rulerY, x2_in: rulerX + rulerW, y2_in: rulerY, line_width_pt: 1 });
  const ticks = Math.round(rulerW * 8);
  for (let i = 0; i <= ticks; i++) {
    const tx = rulerX + (i / 8);
    const tlen = i % 4 === 0 ? 0.1 : 0.06;
    elements.push({ type: 'line', x1_in: tx, y1_in: rulerY, x2_in: tx, y2_in: rulerY + tlen, line_width_pt: 0.75 });
  }
  elements.push({ type: 'text', x_in: rulerX - 0.25, y_in: rulerY - baseFont * 0.2 / IN, w_in: 0.2, text: '0', font_size_pt: baseFont * 0.8, align: 'right' });
  elements.push({ type: 'text', x_in: rulerX + rulerW + 0.04, y_in: rulerY - baseFont * 0.2 / IN, w_in: 0.6, text: `${rulerW.toFixed(2).replace(/0+$/, '').replace(/\.$/, '.0')} IN`, font_size_pt: baseFont * 0.8, align: 'left' });

  // 10pt border rect + corner L-marks at the exact page corners.
  elements.push({ type: 'rect', x_in: inset, y_in: inset, w_in: w - 2 * inset, h_in: h - 2 * inset, line_width_pt: borderLw, stroke: '#000000' });
  const m = 0.02;
  for (const [mx, my, dx, dy] of [
    [m, m, 1, 1], [w - m, m, -1, 1], [m, h - m, 1, -1], [w - m, h - m, -1, -1],
  ]) {
    elements.push({ type: 'line', x1_in: mx, y1_in: my, x2_in: mx + dx * markLen, y2_in: my, line_width_pt: 2 });
    elements.push({ type: 'line', x1_in: mx, y1_in: my, x2_in: mx, y2_in: my + dy * markLen, line_width_pt: 2 });
  }

  return {
    pages: [{ width_in: w, height_in: h, orientation: landscape ? 'landscape' : 'portrait', elements }],
  };
}
