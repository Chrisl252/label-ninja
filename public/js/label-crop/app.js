// Shipping label to 4x6: page wiring. The batch (pages and planned crops), layouts, the crop
// box, job building, PDF output, the sample file and saved settings each live in their own
// module; this file connects them to the page. Heavy libraries load on first use.

import { OUTPUT_SIZES, resolveRotation, normRot, rectSizePt } from './geometry.js';
import { createCropEditor } from './cropbox.js';
import { createPagesView } from './pages-view.js';
import { createBatch, cloneThumb } from './batch.js';
import { friendlyError } from './errors.js';
import { readPrefs, writePrefs } from './prefs.js';

const $ = (id) => document.getElementById(id);
const els = {
  drop: $('lc-drop'), input: $('lc-files'), sample: $('lc-sample'), preset: $('lc-preset'), layout: $('lc-layout'),
  slip: $('lc-slip'), slipHint: $('lc-slip-hint'), rotate: $('lc-rotate'), stage: $('lc-stage'), turn: $('lc-turn'),
  redetect: $('lc-redetect'), copy: $('lc-copy-crop'), pages: $('lc-pages'), make: $('lc-make'), download: $('lc-download'),
  print: $('lc-print'), status: $('lc-status'), progress: $('lc-progress'), clear: $('lc-clear'), count: $('lc-count'),
  editorHint: $('lc-editor-hint'),
};
if (!els.drop) throw new Error('label-crop: page markup missing');

const EMPTY_MESSAGE = 'No label yet. Drop a PDF or image above, paste a screenshot with Ctrl+V, or select "Try a sample label" to watch it work.';
const state = { selected: null, outputUrl: null, busy: false };
let sourcesMod = null, pdfLib = null;
const loadSources = async () => (sourcesMod ||= await import('./sources.js'));
const loadPdfLib = async () => (pdfLib ||= await import('/vendor/pdf-lib-1.17.1/pdf-lib.esm.min.js'));
const batch = createBatch(loadSources);

const say = (msg, tone = '') => { els.status.textContent = msg; els.status.dataset.tone = tone; };
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const sizeRadios = () => [...document.querySelectorAll('input[name="lc-size"]')];
const outputSize = () => sizeRadios().find((r) => r.checked)?.value || '4x6';
const opts = () => ({ preset: els.preset.value, layout: els.layout.value, slip: els.layout.value === 'single' ? els.slip.value : 'drop' });
const itemByKey = (key) => batch.items.find((i) => i.key === key);

function progress(text, done, total) {
  els.progress.hidden = false;
  els.progress.max = Math.max(1, total);
  els.progress.value = Math.min(done, total);
  say(text);
}
const hideProgress = () => { els.progress.hidden = true; };

const editor = createCropEditor(els.stage, { onChange: (rect) => {
  const item = itemByKey(state.selected);
  if (!item) return;
  item.rect = rect; item.note = 'custom crop';
  view.update(item); invalidateOutput();
} });
const view = createPagesView(els.pages, { onSelect: select, onRemove: removeItem });
editor.clear(EMPTY_MESSAGE);

function effectiveRotation(item) {
  if (item.rotation != null) return item.rotation;
  const info = item.source.pages[item.pageIndex];
  const size = rectSizePt(item.rect, info.dispW, info.dispH);
  return resolveRotation(els.rotate.value, size.width, size.height);
}

function updateCount() {
  const n = batch.items.length;
  els.count.textContent = n
    ? `${plural(n, 'label')} from ${plural(batch.pageCount, 'page')} in ${plural(batch.fileCount, 'file')}`
    : 'No files yet';
  els.make.disabled = !n || state.busy;
  els.make.textContent = `Make ${OUTPUT_SIZES[outputSize()].label} PDF${n ? ` (${plural(n, 'page')})` : ''}`;
  for (const b of [els.turn, els.redetect, els.copy]) b.disabled = !state.selected || state.busy;
  els.sample.disabled = state.busy;
  els.clear.hidden = !n;
}

function setBusy(on) { state.busy = on; els.make.classList.toggle('is-busy', on); updateCount(); }

function invalidateOutput() {
  if (state.outputUrl) URL.revokeObjectURL(state.outputUrl);
  state.outputUrl = null;
  els.download.hidden = true;
  els.print.hidden = true;
}

function syncSlipControl() {
  const single = els.layout.value === 'single';
  els.slip.disabled = !single;
  els.slipHint.textContent = single
    ? 'Many labels share a letter page with a packing slip or receipt below the label.'
    : 'Packing slips are only split out when the page has one label.';
}

function savePrefs() {
  writePrefs({ preset: els.preset.value, layout: els.layout.value, slip: els.slip.value, rotate: els.rotate.value, size: outputSize() });
}

function restorePrefs() {
  const p = readPrefs();
  els.preset.value = p.preset; els.layout.value = p.layout; els.slip.value = p.slip; els.rotate.value = p.rotate;
  for (const r of sizeRadios()) r.checked = r.value === p.size;
  syncSlipControl();
}

function renameIfGeneric(file, n) {
  if (file.name && !/^image\.(png|jpe?g)$/i.test(file.name)) return file;
  const ext = file.type === 'image/jpeg' ? 'jpg' : 'png';
  return new File([file], `pasted-label-${n}.${ext}`, { type: file.type || 'image/png' });
}

async function addFiles(fileList) {
  const files = [...fileList];
  if (!files.length || state.busy) return 0;
  setBusy(true);
  invalidateOutput();
  const errors = [];
  let added = 0;
  try {
    const sources = await loadSources();
    for (const [fi, file] of files.entries()) {
      const which = files.length > 1 ? ` (file ${fi + 1} of ${files.length})` : '';
      let source;
      try { source = await sources.loadFile(file); } catch (err) { errors.push(friendlyError(err, file.name)); continue; }
      try {
        const fresh = await batch.addSource(source, opts(), (done, total) =>
          progress(`Reading ${source.name}${which}, page ${Math.min(done + 1, total)} of ${total}…`, done, total));
        for (const item of fresh) view.add(item, cloneThumb(item.page));
        added += fresh.length;
        if (!state.selected && fresh[0]) select(fresh[0].key);
      } catch (err) { errors.push(friendlyError(err, file.name)); }
    }
  } catch {
    errors.push('The PDF reader could not start. Reload the page and try again.');
  } finally {
    setBusy(false); hideProgress();
  }
  if (errors.length) say(`${errors.join(' ')}${added ? ` The other ${plural(added, 'label')} were added.` : ''}`, 'error');
  else if (added) say(`Added ${plural(added, 'label')}. Check each crop, then make your PDF.`, 'ok');
  return added;
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
  const what = item.role === 'slip' ? 'packing slip' : 'label';
  els.editorHint.textContent = `${item.title}: drag the box to fit the ${what}. Output turns ${effectiveRotation(item)}°.`;
}

function showEmpty() { state.selected = null; editor.clear(EMPTY_MESSAGE); els.editorHint.textContent = 'Drag the box to cover the whole label, including its border. Corners resize it.'; }

function removeItem(key) {
  for (const s of batch.removeItem(key)) sourcesMod?.releaseSource(s);
  view.remove(key);
  invalidateOutput();
  if (state.selected === key) {
    if (batch.items[0]) select(batch.items[0].key); else showEmpty();
  }
  updateCount();
}

function rebuildView() {
  view.clear();
  for (const item of batch.items) view.add(item, cloneThumb(item.page));
  state.selected = null;
  if (batch.items[0]) select(batch.items[0].key); else showEmpty();
}

async function replanAll() {
  savePrefs(); syncSlipControl();
  if (!batch.items.length || state.busy) return;
  setBusy(true); invalidateOutput();
  try {
    await batch.replan(opts(), (done, total) => progress(`Updating crops, page ${Math.min(done + 1, total)} of ${total}…`, done, total));
    rebuildView();
    say(`Updated: ${plural(batch.items.length, 'label')} ready. Manual crops were reset.`, 'ok');
  } catch (err) {
    say(`Could not update the crops: ${err.message || err}`, 'error');
  } finally { setBusy(false); hideProgress(); }
}

async function makePdf() {
  const items = batch.items;
  if (!items.length || state.busy) return false;
  setBusy(true);
  try {
    const [PDFLib, sources, { buildJobs }, { buildLabelPdf }] = await Promise.all([loadPdfLib(), loadSources(), import('./jobs.js'), import('./output.js')]);
    const { jobs, rastered } = await buildJobs(items, { PDFLib, sources, rotationOf: effectiveRotation,
      onProgress: (done, total) => progress(`Building your PDF in this tab, label ${Math.min(done + 1, total)} of ${total}…`, done, total) });
    const size = outputSize();
    const { bytes, pages } = await buildLabelPdf(PDFLib, jobs, { size });
    invalidateOutput();
    state.outputUrl = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    els.download.href = state.outputUrl;
    els.download.download = size === '4x6' ? 'shipping-labels-4x6.pdf' : 'shipping-labels-100x150mm.pdf';
    els.download.hidden = false; els.print.hidden = false;
    const extra = rastered ? ` ${plural(rastered, 'page')} came from a locked PDF, so ${rastered === 1 ? 'it was' : 'they were'} copied as 300 dpi images.` : '';
    say(`Done: ${plural(pages, 'page')}, ${OUTPUT_SIZES[size].label} each, ${(bytes.length / 1024).toFixed(0)} KB.${extra}`, 'ok');
    els.download.focus({ preventScroll: true });
    return true;
  } catch (err) {
    say(`Could not build the PDF: ${err.message || err}. Try removing the last file you added.`, 'error');
    return false;
  } finally { setBusy(false); hideProgress(); }
}

async function trySample() {
  if (state.busy) return;
  try {
    const [PDFLib, { buildSamplePdf, SAMPLE_FILE_NAME }] = await Promise.all([loadPdfLib(), import('./sample.js')]);
    const bytes = await buildSamplePdf(PDFLib, { layout: els.layout.value });
    const added = await addFiles([new File([bytes], SAMPLE_FILE_NAME, { type: 'application/pdf' })]);
    if (added && await makePdf()) say(`${els.status.textContent} This was a fake sample label; add your own file the same way.`, 'ok');
  } catch (err) {
    say(`Could not make the sample: ${err.message || err}`, 'error');
  }
}

// --- events -------------------------------------------------------------------------------
els.input.addEventListener('change', () => { addFiles(els.input.files).finally(() => { els.input.value = ''; }); });
els.drop.addEventListener('click', (e) => { if (!e.target.closest('button, label, input, a')) els.input.click(); });
for (const type of ['dragenter', 'dragover']) els.drop.addEventListener(type, (e) => { e.preventDefault(); els.drop.classList.add('is-over'); });
for (const type of ['dragleave', 'drop']) els.drop.addEventListener(type, () => els.drop.classList.remove('is-over'));
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => {
  e.preventDefault(); // a file dropped anywhere on the page is added, never opened in the tab
  addFiles(e.dataTransfer?.files || []);
});
let pasteSeq = 1;
document.addEventListener('paste', (e) => {
  const files = [...(e.clipboardData?.files || [])];
  if (!files.length) return; // plain text paste stays untouched
  e.preventDefault();
  addFiles(files.map((f) => renameIfGeneric(f, pasteSeq++)));
});
els.sample.addEventListener('click', trySample);

els.preset.addEventListener('change', replanAll);
els.layout.addEventListener('change', replanAll);
els.slip.addEventListener('change', replanAll);
els.rotate.addEventListener('change', () => {
  savePrefs();
  for (const item of batch.items) { item.rotation = null; view.update(item); }
  invalidateOutput();
  if (state.selected) select(state.selected);
});
for (const r of sizeRadios()) r.addEventListener('change', () => { savePrefs(); invalidateOutput(); updateCount(); });

els.turn.addEventListener('click', () => {
  const item = itemByKey(state.selected);
  if (!item) return;
  item.rotation = normRot(effectiveRotation(item) + 90);
  view.update(item); invalidateOutput(); select(item.key);
});
els.redetect.addEventListener('click', () => {
  const item = itemByKey(state.selected);
  if (!item) return;
  item.rect = { ...item.auto }; item.note = 'auto-detected';
  view.update(item); invalidateOutput(); select(item.key);
});
els.copy.addEventListener('click', () => {
  const item = itemByKey(state.selected);
  if (!item) return;
  const same = batch.items.filter((o) => o !== item && o.role === item.role && o.slot === item.slot);
  for (const other of same) { other.rect = { ...item.rect }; other.note = 'copied crop'; view.update(other); }
  invalidateOutput();
  say(`Copied this crop to ${plural(same.length, 'other matching label')}.`, 'ok');
});
els.make.addEventListener('click', makePdf);
els.print.addEventListener('click', () => {
  if (!state.outputUrl) return;
  const win = window.open(state.outputUrl, '_blank');
  if (!win) say('Your browser blocked the new tab. Use Download, then open the file and print it.', 'error');
});
els.clear.addEventListener('click', () => {
  for (const s of batch.clear()) sourcesMod?.releaseSource(s);
  view.clear(); invalidateOutput(); showEmpty();
  updateCount(); say('Cleared. Nothing was stored.');
});

restorePrefs();
document.documentElement.classList.add('lc-ready');
updateCount();
