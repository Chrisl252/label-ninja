// Shipping label to 4x6: page wiring. State lives here; loading, detection, the crop box and
// PDF output each live in their own module. Heavy libraries load on first use.

import { PRESETS, OUTPUT_SIZES, presetRect, resolveRotation, normRot, rectSizePt } from './geometry.js';
import { detectLabel } from './detect.js';
import { createCropEditor } from './cropbox.js';
import { createPagesView } from './pages-view.js';

const $ = (id) => document.getElementById(id);
const els = {
  drop: $('lc-drop'), input: $('lc-files'), preset: $('lc-preset'), rotate: $('lc-rotate'),
  stage: $('lc-stage'), turn: $('lc-turn'), redetect: $('lc-redetect'), copy: $('lc-copy-crop'),
  pages: $('lc-pages'), make: $('lc-make'), download: $('lc-download'), print: $('lc-print'),
  status: $('lc-status'), clear: $('lc-clear'), count: $('lc-count'), editorHint: $('lc-editor-hint'),
};
if (!els.drop) throw new Error('label-crop: page markup missing');

const state = { items: [], selected: null, outputUrl: null, busy: false };
let sourcesMod = null, pdfLib = null, keySeq = 1;
const loadSources = async () => (sourcesMod ||= await import('./sources.js'));
const loadPdfLib = async () => (pdfLib ||= await import('/vendor/pdf-lib-1.17.1/pdf-lib.esm.min.js'));

const say = (msg, tone = '') => { els.status.textContent = msg; els.status.dataset.tone = tone; };
const preset = () => els.preset.value;
const outputSize = () => document.querySelector('input[name="lc-size"]:checked')?.value || '4x6';
const itemByKey = (key) => state.items.find((i) => i.key === key);

const editor = createCropEditor(els.stage, { onChange: (rect) => {
  const item = itemByKey(state.selected);
  if (!item) return;
  item.rect = rect; item.note = 'custom crop';
  view.update(item); invalidateOutput();
} });
const view = createPagesView(els.pages, { onSelect: select, onRemove: removeItem });
editor.clear('Add a label file to start. Your pages appear here.');

function rectFor(item) {
  if (preset() === 'auto') return item.detected ? { ...item.detected.rect } : { x: 0, y: 0, w: 1, h: 1 };
  return presetRect(preset());
}
function noteFor(item) {
  if (preset() !== 'auto') return PRESETS[preset()].label.toLowerCase();
  if (!item.detected) return 'blank page, full page used';
  return item.detected.method === 'frame' ? 'label border found' : 'content found';
}
function effectiveRotation(item) {
  if (item.rotation != null) return item.rotation;
  const info = item.source.pages[item.pageIndex];
  const size = rectSizePt(item.rect, info.dispW, info.dispH);
  return resolveRotation(els.rotate.value, size.width, size.height);
}

function updateCount() {
  const files = new Set(state.items.map((i) => i.source.id)).size;
  const n = state.items.length;
  els.count.textContent = n ? `${n} label page${n === 1 ? '' : 's'} from ${files} file${files === 1 ? '' : 's'}` : 'No files yet';
  els.make.disabled = !n || state.busy;
  for (const b of [els.turn, els.redetect, els.copy]) b.disabled = !state.selected;
  els.clear.hidden = !n;
}

function invalidateOutput() {
  if (state.outputUrl) URL.revokeObjectURL(state.outputUrl);
  state.outputUrl = null;
  els.download.hidden = true;
  els.print.hidden = true;
}

async function addFiles(fileList) {
  const files = [...fileList];
  if (!files.length) return;
  const { loadFile, renderPage } = await loadSources().catch((err) => { say(`Could not start the PDF reader: ${err.message}`, 'error'); throw err; });
  invalidateOutput();
  let added = 0;
  for (const file of files) {
    let source;
    try { source = await loadFile(file); } catch (err) { say(err.message || `Could not open ${file.name}.`, 'error'); continue; }
    for (const page of source.pages) {
      say(`Reading ${source.name}, page ${page.index + 1} of ${source.pages.length}…`);
      const title = source.pages.length > 1 ? `${source.name} · p${page.index + 1}` : source.name;
      const item = { key: keySeq++, source, pageIndex: page.index, title, rect: null, rotation: null, detected: null, note: '' };
      const canvas = await renderPage(source, page.index, 640);
      const px = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
      item.detected = detectLabel(px);
      item.rect = rectFor(item); item.note = noteFor(item);
      state.items.push(item);
      view.add(item, thumbnail(canvas));
      canvas.width = 0;
      added++;
      if (!state.selected) select(item.key);
    }
  }
  updateCount();
  if (added) say(`Added ${added} page${added === 1 ? '' : 's'}. Check each crop, then make your 4×6 PDF.`, 'ok');
}

function thumbnail(canvas) {
  const t = document.createElement('canvas');
  const w = 180, h = Math.round((canvas.height / canvas.width) * w);
  t.width = w; t.height = h;
  t.getContext('2d').drawImage(canvas, 0, 0, w, h);
  return t;
}

async function select(key) {
  const item = itemByKey(key);
  if (!item) return;
  state.selected = key;
  view.select(key);
  updateCount();
  const { renderPage } = await loadSources();
  const width = Math.min(1400, Math.max(320, els.stage.clientWidth) * (window.devicePixelRatio || 1));
  const canvas = await renderPage(item.source, item.pageIndex, width);
  if (state.selected !== key) return; // a newer selection won
  editor.show(canvas, item.rect);
  els.editorHint.textContent = `${item.title}: drag the box to fit the label. Output turns ${effectiveRotation(item)}°.`;
}

function removeItem(key) {
  const idx = state.items.findIndex((i) => i.key === key);
  if (idx < 0) return;
  const [item] = state.items.splice(idx, 1);
  view.remove(key);
  if (!state.items.some((i) => i.source === item.source)) sourcesMod?.releaseSource(item.source);
  invalidateOutput();
  if (state.selected === key) {
    state.selected = null;
    if (state.items[0]) select(state.items[0].key); else editor.clear('Add a label file to start. Your pages appear here.');
  }
  updateCount();
}

function applyPresetToAll() {
  for (const item of state.items) { item.rect = rectFor(item); item.note = noteFor(item); view.update(item); }
  invalidateOutput();
  if (state.selected) select(state.selected);
}

async function buildJobs(PDFLib) {
  const { cropImage, rasterizePdfCrop } = await loadSources();
  const docs = new Map();
  const jobs = [];
  let rastered = 0;
  for (const item of state.items) {
    const src = item.source;
    const rotation = effectiveRotation(item);
    if (src.kind === 'image') { jobs.push({ kind: 'image', rotation, ...(await cropImage(src, item.rect)) }); continue; }
    if (!docs.has(src.id)) {
      let doc = null;
      try { doc = await PDFLib.PDFDocument.load(src.bytes, { ignoreEncryption: true, updateMetadata: false }); if (doc.isEncrypted) doc = null; } catch { doc = null; }
      docs.set(src.id, doc);
    }
    const doc = docs.get(src.id);
    if (doc) {
      jobs.push({ kind: 'pdf', doc, pageIndex: item.pageIndex, rect: item.rect, rotation });
    } else {
      rastered++;
      const img = await rasterizePdfCrop(src, item.pageIndex, item.rect);
      // The raster is already in display orientation; keep the user's choice relative to it.
      jobs.push({ kind: 'image', rotation, ...img });
    }
  }
  return { jobs, rastered };
}

async function makePdf() {
  if (!state.items.length || state.busy) return;
  state.busy = true; updateCount();
  els.make.classList.add('is-busy');
  say('Building your 4×6 PDF in this tab…');
  try {
    const PDFLib = await loadPdfLib();
    const { jobs, rastered } = await buildJobs(PDFLib);
    const size = outputSize();
    const { bytes, pages } = await buildLabelPdfLazy(PDFLib, jobs, size);
    invalidateOutput();
    state.outputUrl = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    els.download.href = state.outputUrl;
    els.download.download = size === '4x6' ? 'shipping-labels-4x6.pdf' : 'shipping-labels-100x150mm.pdf';
    els.download.hidden = false; els.print.hidden = false;
    const extra = rastered ? ` ${rastered} page${rastered === 1 ? ' was' : 's were'} protected, so ${rastered === 1 ? 'it was' : 'they were'} copied as 300 dpi images.` : '';
    say(`Done: ${pages} page${pages === 1 ? '' : 's'}, ${OUTPUT_SIZES[size].label} each, ${(bytes.length / 1024).toFixed(0)} KB.${extra}`, 'ok');
    els.download.focus();
  } catch (err) {
    say(`Could not build the PDF: ${err.message || err}`, 'error');
  } finally {
    state.busy = false; els.make.classList.remove('is-busy'); updateCount();
  }
}

async function buildLabelPdfLazy(PDFLib, jobs, size) {
  const { buildLabelPdf } = await import('./output.js');
  return buildLabelPdf(PDFLib, jobs, { size });
}

// --- events -------------------------------------------------------------------------------
els.input.addEventListener('change', () => { addFiles(els.input.files).finally(() => { els.input.value = ''; }); });
for (const type of ['dragenter', 'dragover']) els.drop.addEventListener(type, (e) => { e.preventDefault(); els.drop.classList.add('is-over'); });
for (const type of ['dragleave', 'drop']) els.drop.addEventListener(type, () => els.drop.classList.remove('is-over'));
els.drop.addEventListener('drop', (e) => { e.preventDefault(); addFiles(e.dataTransfer?.files || []); });
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => {
  if (els.drop.contains(e.target)) return;
  e.preventDefault(); // a file dropped anywhere on the page is added, never opened in the tab
  addFiles(e.dataTransfer?.files || []);
});

els.preset.addEventListener('change', applyPresetToAll);
els.rotate.addEventListener('change', () => {
  for (const item of state.items) { item.rotation = null; view.update(item); }
  invalidateOutput();
  if (state.selected) select(state.selected);
});
for (const r of document.querySelectorAll('input[name="lc-size"]')) r.addEventListener('change', invalidateOutput);

els.turn.addEventListener('click', () => {
  const item = itemByKey(state.selected);
  if (!item) return;
  item.rotation = normRot(effectiveRotation(item) + 90);
  view.update(item); invalidateOutput(); select(item.key);
});
els.redetect.addEventListener('click', () => {
  const item = itemByKey(state.selected);
  if (!item) return;
  item.rect = item.detected ? { ...item.detected.rect } : { x: 0, y: 0, w: 1, h: 1 };
  item.note = item.detected ? 'auto-detected' : 'nothing detected, full page used';
  view.update(item); invalidateOutput(); select(item.key);
});
els.copy.addEventListener('click', () => {
  const item = itemByKey(state.selected);
  if (!item) return;
  for (const other of state.items) {
    if (other === item) continue;
    other.rect = { ...item.rect }; other.note = 'copied crop'; view.update(other);
  }
  invalidateOutput();
  say(`Copied this crop to ${state.items.length - 1} other page${state.items.length === 2 ? '' : 's'}.`, 'ok');
});
els.make.addEventListener('click', makePdf);
els.print.addEventListener('click', () => {
  if (!state.outputUrl) return;
  const win = window.open(state.outputUrl, '_blank');
  if (!win) say('Your browser blocked the new tab. Use Download, then open the file and print it.', 'error');
});
els.clear.addEventListener('click', () => {
  for (const s of new Set(state.items.map((i) => i.source))) sourcesMod?.releaseSource(s);
  state.items = []; state.selected = null;
  view.clear(); invalidateOutput(); editor.clear('Add a label file to start. Your pages appear here.');
  updateCount(); say('Cleared. Nothing was stored.');
});

document.documentElement.classList.add('lc-ready');
updateCount();
