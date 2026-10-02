// File loading and rendering for the 4x6 converter. Everything stays in this tab: files are
// read with the File API and rendered by a self-hosted pdf.js; nothing is uploaded.

import * as pdfjsLib from '/vendor/pdfjs-4.10.38/pdf.min.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs-4.10.38/pdf.worker.min.mjs';

const MAX_FILE_BYTES = 80 * 1024 * 1024; // a sanity guard for the tab's memory, not a quota
let nextId = 1;

export function fileKind(file) {
  const name = (file.name || '').toLowerCase();
  if (file.type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  if (file.type === 'image/png' || name.endsWith('.png')) return 'png';
  if (file.type === 'image/jpeg' || /\.jpe?g$/.test(name)) return 'jpg';
  return null;
}

/** Load one File. Resolves to a source {id, name, kind, bytes, pages:[{index, dispW, dispH}]}. */
export async function loadFile(file) {
  const kind = fileKind(file);
  if (!kind) throw new Error(`${file.name}: not a PDF, PNG or JPG file.`);
  if (file.size > MAX_FILE_BYTES) throw new Error(`${file.name}: larger than 80 MB.`);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const base = { id: nextId++, name: file.name || 'label', bytes };
  if (kind === 'pdf') {
    // pdf.js transfers its buffer to the worker, so hand it a copy and keep ours for pdf-lib.
    const pdf = await pdfjsLib.getDocument({ data: bytes.slice(), isEvalSupported: false }).promise;
    const pages = [];
    for (let i = 0; i < pdf.numPages; i++) {
      const vp = (await pdf.getPage(i + 1)).getViewport({ scale: 1 });
      pages.push({ index: i, dispW: vp.width, dispH: vp.height });
    }
    return { ...base, kind: 'pdf', pdf, pages };
  }
  const bitmap = await createImageBitmap(new Blob([bytes], { type: kind === 'png' ? 'image/png' : 'image/jpeg' }));
  return { ...base, kind: 'image', format: kind, bitmap, pages: [{ index: 0, dispW: bitmap.width, dispH: bitmap.height }] };
}

function blankCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  return c;
}

/** Render a page so its width is `targetW` pixels. Returns a canvas on a white background. */
export async function renderPage(source, pageIndex, targetW) {
  const info = source.pages[pageIndex];
  const scale = targetW / info.dispW;
  const canvas = blankCanvas(info.dispW * scale, info.dispH * scale);
  const ctx = canvas.getContext('2d');
  if (source.kind === 'pdf') {
    const page = await source.pdf.getPage(pageIndex + 1);
    const viewport = page.getViewport({ scale: canvas.width / info.dispW });
    // intent 'print' renders without requestAnimationFrame, so batches keep going in a
    // background tab, and includes print-only annotations the label PDF may rely on.
    await page.render({ canvasContext: ctx, viewport, intent: 'print', background: 'rgb(255,255,255)' }).promise;
  } else {
    ctx.drawImage(source.bitmap, 0, 0, canvas.width, canvas.height);
  }
  return canvas;
}

/** Pixels for auto-detect, at a resolution that is quick to scan. */
export async function pagePixels(source, pageIndex, targetW = 640) {
  const canvas = await renderPage(source, pageIndex, targetW);
  return canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
}

function canvasPng(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) { reject(new Error('Could not encode the cropped image.')); return; }
      resolve(new Uint8Array(await blob.arrayBuffer()));
    }, 'image/png');
  });
}

const isFull = (r) => !r || (r.x <= 0 && r.y <= 0 && r.w >= 1 && r.h >= 1);

/** Crop an image source at its native resolution. An uncropped image keeps its original bytes. */
export async function cropImage(source, rect) {
  const { bitmap } = source;
  if (isFull(rect)) return { bytes: source.bytes, format: source.format, width: bitmap.width, height: bitmap.height };
  const sx = Math.round(rect.x * bitmap.width), sy = Math.round(rect.y * bitmap.height);
  const sw = Math.max(1, Math.round(rect.w * bitmap.width)), sh = Math.max(1, Math.round(rect.h * bitmap.height));
  const canvas = blankCanvas(sw, sh);
  canvas.getContext('2d').drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh);
  return { bytes: await canvasPng(canvas), format: 'png', width: sw, height: sh };
}

/**
 * Fallback for PDFs pdf-lib cannot embed (for example encrypted files): render the crop at
 * 300 dpi with pdf.js and embed it as a PNG. Only used when the vector path fails.
 */
export async function rasterizePdfCrop(source, pageIndex, rect, dpi = 300) {
  const info = source.pages[pageIndex];
  const full = await renderPage(source, pageIndex, (info.dispW / 72) * dpi);
  const r = rect || { x: 0, y: 0, w: 1, h: 1 };
  const sx = Math.round(r.x * full.width), sy = Math.round(r.y * full.height);
  const sw = Math.max(1, Math.round(r.w * full.width)), sh = Math.max(1, Math.round(r.h * full.height));
  const canvas = blankCanvas(sw, sh);
  canvas.getContext('2d').drawImage(full, sx, sy, sw, sh, 0, 0, sw, sh);
  full.width = 0; // release the large canvas promptly
  return { bytes: await canvasPng(canvas), format: 'png', width: sw, height: sh };
}

export async function releaseSource(source) {
  if (source.kind === 'pdf') await source.pdf.destroy().catch(() => {});
  else source.bitmap.close?.();
}
