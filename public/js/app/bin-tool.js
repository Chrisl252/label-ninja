// Bin tool — settings collection, print hint, validation, and the metered
// "Download PDF" flow (spec math lives in spec-builders.js).

import { BIN_LAYOUTS, clampNumber } from './presets.js';
import { buildBinSpec } from './spec-builders.js';
import { runExport } from './exporter.js';

const MAX_EXPORT_PAGES = 200; // server cap: one page per label

export function getBinSettings() {
  const layout = BIN_LAYOUTS[document.getElementById('bin-layout').value] || BIN_LAYOUTS.portrait;
  return {
    ...layout,
    padding: clampNumber(document.getElementById('bin-padding').value, 0, 0.6, 0.18),
    titleSize: clampNumber(document.getElementById('bin-title-size').value, 0.25, 1.4, 0.72),
    barcodeHeight: clampNumber(document.getElementById('bin-barcode-height').value, 0.75, 4, 2.45),
    showValue: document.getElementById('bin-show-value').checked,
  };
}

export function updateBinPrintHint() {
  const stock = getBinSettings();
  document.getElementById('bin-print-hint').textContent =
    `${stock.name} setup: your PDF is exactly ${stock.name} — print it at 100% scale with margins none (${stock.driverSize} paper, ${stock.orientation}). Each bin number and barcode prints together on one label.`;
}

export function exportBinBatch(button) {
  const prefix = document.getElementById('bin-prefix').value || 'BIN ';
  const shelf = document.getElementById('bin-shelf').value || 'A';
  const start = parseInt(document.getElementById('bin-start').value || 1, 10);
  const end = parseInt(document.getElementById('bin-end').value || 20, 10);

  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end > 500 || end < start) {
    window.alert('Choose a valid bin range from 1 to 500.');
    return;
  }
  if (end - start + 1 > MAX_EXPORT_PAGES) {
    window.alert(`Server PDF exports max out at ${MAX_EXPORT_PAGES} pages per batch. Split your range (1–${start + MAX_EXPORT_PAGES - 1}, then continue) and export twice.`);
    return;
  }

  const settings = getBinSettings();
  runExport(
    'bin',
    () => buildBinSpec({ prefix, shelf, start, end, ...settings }),
    button,
  );
}
