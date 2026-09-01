// Spec builders — pure DOM-free functions that turn tool state into validated
// /api/export job bodies (without the idempotency key; exporter.js adds it).
// These mirror the legacy client print layout math and are covered by
// scripts/test-spec-builders.mjs. Element contracts: src/spec-validate.js.

const ASCII_RE = /^[\x20-\x7e]+$/;

function round4(n) {
  return Math.round(n * 10000) / 10000;
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

// ---- shared layout math (mirrors the old DOM generators) ----

// Bin title size in inches — landscape shrinks to fit 88% of stock width.
export function binTitleSizeIn(binText, settings) {
  if (settings.orientation !== 'Landscape') return settings.titleSize;
  const maxTitleWidth = settings.width * 0.88;
  const fitted = maxTitleWidth / Math.max(1, binText.length * 0.56);
  return Math.min(settings.titleSize, fitted);
}

// Whatnot number size in inches — fits 72% of stock height / 90% of width.
export function whatnotFontSizeIn(text, stock) {
  const heightLimit = stock.height * 0.72;
  const widthLimit = (stock.width * 0.9) / Math.max(1, text.length * 0.58);
  return Math.max(0.12, Math.min(heightLimit, widthLimit));
}

function binBarcodeCode(binText) {
  return binText.replace(/\s+/g, '-');
}

// ---- bin: one page per label, title + CODE128, justify-around (portrait) /
// justify-center gap 0.28in (landscape) exactly like the old DOM batch. ----
export function buildBinSpec(input) {
  const { prefix, shelf, start, end } = input;
  const s = {
    width: input.width,
    height: input.height,
    orientation: input.orientation,
    padding: input.padding,
    titleSize: input.titleSize,
    barcodeHeight: input.barcodeHeight,
    showValue: input.showValue,
  };
  const pad = s.padding;
  const innerW = Math.max(0.1, s.width - 2 * pad);

  const pages = [];
  for (let i = start; i <= end; i++) {
    const binText = `${prefix}${i}${shelf}`;
    const titleIn = binTitleSizeIn(binText, s);
    const bcH = Math.min(s.barcodeHeight, Math.max(0.1, s.height - 2 * pad - titleIn - 0.1));

    let titleY;
    let bcY;
    if (s.orientation === 'Landscape') {
      const gap = 0.28;
      const contentH = titleIn + gap + bcH;
      const top = pad + Math.max(0, (s.height - 2 * pad - contentH) / 2);
      titleY = top;
      bcY = top + titleIn + gap;
    } else {
      const free = Math.max(0, s.height - 2 * pad - titleIn - bcH);
      const around = free / 4;
      titleY = pad + around;
      bcY = pad + 3 * around + titleIn;
    }
    titleY = clamp(titleY, 0, Math.max(0, s.height - titleIn));
    bcY = clamp(bcY, 0, Math.max(0, s.height - bcH));

    const titleX = pad;
    const titleW = s.orientation === 'Landscape' ? innerW * 0.92 : innerW;
    const bcW = innerW * 0.92;
    const bcX = pad + (innerW - bcW) / 2;

    pages.push({
      width_in: s.width,
      height_in: s.height,
      orientation: s.orientation === 'Landscape' ? 'landscape' : 'portrait',
      elements: [
        {
          type: 'text',
          x_in: round4(titleX),
          y_in: round4(titleY),
          w_in: round4(titleW),
          text: binText,
          font_size_pt: round4(titleIn * 72),
          bold: true,
          align: 'center',
        },
        {
          type: 'barcode',
          subtype: 'code128',
          value: binBarcodeCode(binText),
          x_in: round4(bcX),
          y_in: round4(bcY),
          w_in: round4(bcW),
          h_in: round4(bcH),
          show_text: s.showValue,
        },
      ],
    });
  }
  return { tool: 'bin', settings: {}, pages };
}

// ---- whatnot: text-only pages, one giant centered number per label ----
export function buildWhatnotSpec(input) {
  const { prefix, start, end } = input;
  const stock = { width: input.width, height: input.height, padding: input.padding };
  const pages = [];
  for (let i = start; i <= end; i++) {
    const numText = `${prefix}${i}`;
    const fontIn = whatnotFontSizeIn(numText, stock);
    const y = Math.max(stock.padding, (stock.height - fontIn) / 2);
    pages.push({
      width_in: stock.width,
      height_in: stock.height,
      orientation: stock.width >= stock.height ? 'landscape' : 'portrait',
      elements: [
        {
          type: 'text',
          x_in: round4(stock.padding),
          y_in: round4(y),
          w_in: round4(Math.max(0.05, stock.width - 2 * stock.padding)),
          text: numText,
          font_size_pt: round4(fontIn * 72),
          bold: true,
          align: 'center',
        },
      ],
    });
  }
  return { tool: 'whatnot', settings: {}, pages };
}

// ---- fnsku: single 2x1 label — title / CODE128 / condition (mirrors the old
// printSingleFNSKU 320x180px canvas: 14px title, 65px barcode, 12px condition,
// justify-around). ----
const FNSKU_PX = { width: 320, height: 180, printWidth: 2, printHeight: 1 };
const FNSKU_SCALE = FNSKU_PX.printWidth / FNSKU_PX.width; // in per px

export function buildFnskuSpec(input) {
  const value = String(input.value || '').trim();
  if (!value || !ASCII_RE.test(value)) {
    throw new Error('Barcode value must be 1-200 printable ASCII characters (letters, numbers, spaces, symbols).');
  }
  const title = String(input.title || '');
  const condition = String(input.condition || 'New');

  const titlePt = 14 * FNSKU_SCALE * 72; // 6.3pt
  const condPt = 12 * FNSKU_SCALE * 72; // 5.4pt
  const titleH = 14 * FNSKU_SCALE;
  const bcH = 65 * FNSKU_SCALE;
  const condH = 12 * FNSKU_SCALE;
  const marginX = 0.1; // 5% side margins on a 2in page (old div width:90%)
  const w = FNSKU_PX.printWidth;
  const h = FNSKU_PX.printHeight;

  const free = Math.max(0, h - titleH - bcH - condH);
  const around = free / 6; // justify-around, 3 items
  const titleY = around;
  const bcY = titleY + titleH + 2 * around;
  const condY = bcY + bcH + 2 * around;

  const elements = [];
  if (title) {
    elements.push({
      type: 'text', x_in: round4(marginX), y_in: round4(titleY),
      w_in: round4(w - 2 * marginX), text: title, font_size_pt: round4(titlePt), bold: true, align: 'center',
    });
  }
  elements.push({
    type: 'barcode', subtype: 'code128', value,
    x_in: round4(marginX), y_in: round4(bcY), w_in: round4(w - 2 * marginX), h_in: round4(bcH), show_text: true,
  });
  if (condition) {
    elements.push({
      type: 'text', x_in: 0, y_in: round4(condY), w_in: w,
      text: condition, font_size_pt: round4(condPt), bold: true, align: 'center',
    });
  }
  return {
    tool: 'fnsku',
    settings: {},
    pages: [{ width_in: w, height_in: h, orientation: 'landscape', elements }],
  };
}

// ---- editor: canvas px elements -> spec inches via the active preset scale ----
// x_in = x/width_px*printWidth_in; font pt = px * printWidth_in*72/width_px.
export function parseDataUrl(src) {
  if (typeof src !== 'string') return null;
  const m = src.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=\s]+)$/);
  if (!m) return null;
  return { mime: m[1], base64: m[2].replace(/\s+/g, '') };
}

function estimateTextWidthPx(text, fontSizePx) {
  const longest = String(text).split('\n').reduce((max, line) => Math.max(max, line.length), 0);
  return longest * fontSizePx * 0.62;
}

export function buildEditorSpec(input) {
  const preset = input.preset;
  const sx = preset.printWidth / preset.width; // in per px
  const sy = preset.printHeight / preset.height;
  const ptPerPx = preset.printWidth * 72 / preset.width;

  const clampX = (v) => round4(clamp(v, 0, preset.printWidth));
  const clampY = (v) => round4(clamp(v, 0, preset.printHeight));

  const elements = [];
  for (const el of input.elements || []) {
    if (!el) continue;
    const x = clampX(el.x * sx);
    const y = clampY(el.y * sy);
    if (el.type === 'text') {
      elements.push({
        type: 'text',
        x_in: x,
        y_in: y,
        w_in: round4(Math.max(0, (preset.width - el.x) * sx)),
        text: String(el.text || ''),
        font_size_pt: round4(Math.max(1, (el.fontSize || 24) * ptPerPx)),
        bold: !!el.bold,
        align: ['left', 'center', 'right'].includes(el.align) ? el.align : 'left',
      });
    } else if (el.type === 'barcode') {
      const value = String(el.text || '').trim();
      if (!ASCII_RE.test(value)) {
        throw new Error(`Barcode "${value.slice(0, 20)}" must use printable ASCII characters.`);
      }
      elements.push({
        type: 'barcode',
        subtype: 'code128',
        value,
        x_in: x,
        y_in: y,
        w_in: round4(clamp(Math.max(0.2, el.width * sx), 0.2, preset.printWidth)),
        h_in: round4(clamp(66 * sy, 0.05, preset.printHeight)),
        show_text: true,
      });
    } else if (el.type === 'badge') {
      const text = String(el.text || '');
      const fs = el.fontSize || 16;
      const wPx = estimateTextWidthPx(text, fs) + 24;
      const hPx = fs * 1.5 + 12;
      elements.push({
        type: 'rect',
        x_in: x,
        y_in: y,
        w_in: round4(clamp(wPx * sx, 0.1, preset.printWidth)),
        h_in: round4(clamp(hPx * sy, 0.05, preset.printHeight)),
        fill: '#000000',
      });
      elements.push({
        type: 'text',
        x_in: clampX((el.x + 12) * sx),
        y_in: clampY((el.y + 6) * sy),
        w_in: round4(clamp(Math.max(0, wPx - 24) * sx, 0.1, preset.printWidth)),
        text,
        font_size_pt: round4(Math.max(1, fs * ptPerPx)),
        color: '#ffffff',
        bold: true,
        align: 'center',
      });
    } else if (el.type === 'box') {
      const text = String(el.text || '');
      const fs = el.fontSize || 16;
      const lines = text.split('\n').length || 1;
      const wPx = Math.max(el.width || 0, estimateTextWidthPx(text, fs)) + 20;
      const hPx = lines * fs * 1.2 + 20;
      elements.push({
        type: 'rect',
        x_in: x,
        y_in: y,
        w_in: round4(clamp(wPx * sx, 0.1, preset.printWidth)),
        h_in: round4(clamp(hPx * sy, 0.05, preset.printHeight)),
        stroke: '#000000',
        line_width_pt: round4(Math.max(0.5, 2 * ptPerPx)),
      });
      elements.push({
        type: 'text',
        x_in: clampX((el.x + 10) * sx),
        y_in: clampY((el.y + 10) * sy),
        w_in: round4(clamp(Math.max(0, wPx - 20) * sx, 0.1, preset.printWidth)),
        text,
        font_size_pt: round4(Math.max(1, fs * ptPerPx)),
        bold: true,
        align: 'center',
      });
    } else if (el.type === 'image') {
      const parsed = parseDataUrl(el.src);
      if (!parsed) throw new Error('An uploaded image could not be read — remove and re-add it.');
      if (parsed.mime === 'image/webp') throw new Error('webp_image');
      const wIn = round4(clamp(Math.max(0.05, el.width * sx), 0.05, preset.printWidth));
      const hIn = round4(clamp(wIn / (el.aspectRatio || 1), 0.05, preset.printHeight));
      elements.push({
        type: 'image',
        x_in: x,
        y_in: y,
        w_in: wIn,
        h_in: hIn,
        data_base64: parsed.base64,
        mime: parsed.mime,
      });
    }
  }

  return {
    tool: 'editor',
    settings: {},
    pages: [{
      width_in: preset.printWidth,
      height_in: preset.printHeight,
      orientation: preset.printWidth >= preset.printHeight ? 'landscape' : 'portrait',
      elements,
    }],
  };
}

// ---- test print: settings only; the server renders the diagnostic page ----
export function buildTestPrintJob(widthIn, heightIn) {
  return { tool: 'test_print', settings: { width_in: widthIn, height_in: heightIn } };
}
