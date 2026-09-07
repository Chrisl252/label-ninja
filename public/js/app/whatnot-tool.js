// Whatnot tool — sequential live-show number batches as metered PDF exports.

import { WHATNOT_STOCKS } from './presets.js';
import { buildWhatnotSpec } from './spec-builders.js';
import { runExport } from './exporter.js';
import { validateWhatnotSettings, whatnotSettingsFromSearch, WHATNOT_TOOL_HASH } from '../whatnot-settings.js';

function readSettings() {
  return {
    stock: document.getElementById('wn-stock').value,
    prefix: document.getElementById('wn-prefix').value,
    start: document.getElementById('wn-start').value,
    end: document.getElementById('wn-end').value,
  };
}

export function initWhatnotTool() {
  if (window.location.hash === WHATNOT_TOOL_HASH) {
    const settings = whatnotSettingsFromSearch(window.location.search);
    if (settings) {
      for (const [field, value] of Object.entries(settings)) {
        document.getElementById(`wn-${field}`).value = String(value);
      }
    }
  }
  document.getElementById('mode-whatnot').addEventListener('input', updateWhatnotPrintHint);
  updateWhatnotPrintHint();
}

export function getWhatnotStock() {
  return WHATNOT_STOCKS[document.getElementById('wn-stock').value] || WHATNOT_STOCKS.tiny;
}

export function updateWhatnotPrintHint() {
  const stock = getWhatnotStock();
  document.getElementById('wn-print-hint').textContent =
    `${stock.name} PDF: select matching paper in your printer settings, print at 100% / Actual size, with no margins. Check that your printer supports this stock, then print one page before the full batch.`;
  const preview = document.getElementById('wn-preview');
  const text = document.getElementById('wn-preview-number');
  preview.style.aspectRatio = `${stock.width} / ${stock.height}`;
  try {
    const settings = validateWhatnotSettings(readSettings());
    text.textContent = `${settings.prefix}${settings.start}`;
    text.style.fontSize = `${Math.min(4.25, 12 / Math.max(text.textContent.length, 1))}rem`;
    document.getElementById('wn-preview-caption').textContent = `${stock.name} · ${settings.end - settings.start + 1} labels · 1 PDF batch`;
  } catch {
    text.textContent = '—';
    document.getElementById('wn-preview-caption').textContent = 'Check your number range and prefix';
  }
}

export function exportWhatnotBatch(button) {
  let settings;
  try {
    settings = validateWhatnotSettings(readSettings());
  } catch (error) {
    window.alert(error.message);
    return;
  }
  runExport(
    'whatnot',
    () => buildWhatnotSpec({ ...settings, ...WHATNOT_STOCKS[settings.stock] }),
    button,
  );
}
