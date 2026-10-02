// Live previews for the bin and FNSKU tools: the sample label redraws from
// the form as you type (first label of the batch, real CODE128 bars), and the
// caption states exactly what the PDF will contain. Export still builds from
// spec-builders.js; this module only draws.

import { BIN_LAYOUTS } from './presets.js';
import { binBarcodeCode } from './spec-builders.js';
import { renderBarcodeSvg } from './barcode-svg.js';

function el(id) {
  return document.getElementById(id);
}

function intOr(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isInteger(n) ? n : fallback;
}

export function updateBinPreview() {
  const prefix = el('bin-prefix').value || 'BIN ';
  const shelf = el('bin-shelf').value || 'A';
  const start = intOr(el('bin-start').value, 1);
  const end = intOr(el('bin-end').value, 20);
  const layoutKey = el('bin-layout').value;
  const layout = BIN_LAYOUTS[layoutKey] || BIN_LAYOUTS.portrait;
  const first = `${prefix}${start}${shelf}`;
  el('bin-preview').classList.toggle('sample--bin-landscape', layoutKey === 'landscape');
  el('bin-preview-title').textContent = first;
  renderBarcodeSvg(el('bin-preview-barcode'), binBarcodeCode(first), { height: 60, fontSize: 12, showText: el('bin-show-value').checked });
  const count = end - start + 1;
  const valid = start >= 1 && end <= 500 && count >= 1;
  el('bin-preview-caption').textContent = valid
    ? `${first} to ${prefix}${end}${shelf} · ${count} label${count === 1 ? '' : 's'} · ${layout.name} ${layout.orientation.toLowerCase()}`
    : 'Check the range: start and end between 1 and 500, end at or after start';
  for (const id of ['bin-start', 'bin-end']) el(id).setAttribute('aria-invalid', valid ? 'false' : 'true');
}

export function updateFnskuPreview() {
  const value = el('fnsku-val').value.trim() || 'X001ABC123';
  el('fnsku-preview-title').textContent = el('fnsku-title').value || 'Product Title';
  el('fnsku-preview-cond').textContent = `Condition: ${el('fnsku-cond').value || 'New'}`;
  const ok = renderBarcodeSvg(el('fnsku-preview-barcode'), value, { height: 44, fontSize: 11 });
  el('fnsku-val').setAttribute('aria-invalid', ok ? 'false' : 'true');
  el('fnsku-preview-caption').textContent = ok ? 'Sample · 2 x 1 in' : 'Use letters, numbers and standard symbols only';
}

export function initLivePreviews() {
  el('mode-bin').addEventListener('input', updateBinPreview);
  el('mode-bin').addEventListener('change', updateBinPreview);
  el('mode-fnsku').addEventListener('input', updateFnskuPreview);
  updateBinPreview();
  updateFnskuPreview();
}
