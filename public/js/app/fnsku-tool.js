// FNSKU tool — single FNSKU/UPC label as a metered PDF export.

import { buildFnskuSpec } from './spec-builders.js';
import { runExport } from './exporter.js';

export function exportFnskuLabel(button) {
  const value = document.getElementById('fnsku-val').value || 'X001ABC123';
  const title = document.getElementById('fnsku-title').value || 'Product Title';
  const condition = document.getElementById('fnsku-cond').value || 'New';

  runExport(
    'fnsku',
    () => buildFnskuSpec({ value, title, condition }),
    button,
  );
}
