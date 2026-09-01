// Whatnot tool — sequential live-show number batches as metered PDF exports.

import { WHATNOT_STOCKS } from './presets.js';
import { buildWhatnotSpec } from './spec-builders.js';
import { runExport } from './exporter.js';

const MAX_EXPORT_PAGES = 200; // server cap: one page per number

export function getWhatnotStock() {
  return WHATNOT_STOCKS[document.getElementById('wn-stock').value] || WHATNOT_STOCKS.tiny;
}

export function updateWhatnotPrintHint() {
  const stock = getWhatnotStock();
  document.getElementById('wn-print-hint').textContent =
    `${stock.name} setup: your PDF is exactly ${stock.name} — print at 100% scale with margins none (${stock.driverSize} paper, Landscape). Do not use the 10% scale shown in your previous print preview.`;
}

export function exportWhatnotBatch(button) {
  const prefix = document.getElementById('wn-prefix').value || '#';
  const start = parseInt(document.getElementById('wn-start').value || 1, 10);
  const end = parseInt(document.getElementById('wn-end').value || 50, 10);

  if (!Number.isInteger(start) || !Number.isInteger(end) || end < start || start < 1 || end > 999) {
    window.alert('End number must be greater than or equal to the start number (1-999).');
    return;
  }
  if (end - start + 1 > MAX_EXPORT_PAGES) {
    window.alert(`Server PDF exports max out at ${MAX_EXPORT_PAGES} pages per batch. Split your sequence (up to ${MAX_EXPORT_PAGES} numbers at a time) and export again.`);
    return;
  }

  const stock = getWhatnotStock();
  runExport(
    'whatnot',
    () => buildWhatnotSpec({ prefix, start, end, ...stock }),
    button,
  );
}
