// Preset data — label stocks for the editor, Whatnot tool, and bin tool.
// Pure data + one numeric helper; no DOM, importable from node tests.

export const PRESETS = {
  standard: { width: 360, height: 200, printWidth: 2.25, printHeight: 1.25, name: '2.25x1.25 Dymo 30336' },
  fnsku: { width: 320, height: 180, printWidth: 2, printHeight: 1, name: '2x1 Dymo 30334' },
  address: { width: 520, height: 160, printWidth: 3.5, printHeight: 1.125, name: '1.125x3.5 Address' },
  small_sq: { width: 200, height: 200, printWidth: 1, printHeight: 1, name: '1x1 Square' },
  small_bc: { width: 300, height: 120, printWidth: 2, printHeight: 0.75, name: '2x0.75 Barcode' },
  large_multi: { width: 370, height: 640, printWidth: 2.3125, printHeight: 4, name: '2.31x4 Large Multi' },
  shipping: { width: 400, height: 600, printWidth: 4, printHeight: 6, name: '4x6 Box Shipping' },
  box_3: { width: 400, height: 300, printWidth: 4, printHeight: 3, name: '4x3 Box Inventory' },
  product_3x2: { width: 420, height: 280, printWidth: 3, printHeight: 2, name: '3x2 Whatnot Show' },
  polybag: { width: 300, height: 300, printWidth: 2, printHeight: 2, name: '2x2 Square Polybag' },
  polybag_large: { width: 360, height: 640, printWidth: 2.25, printHeight: 4, name: '2.25x4 Suffocation Warning' },
};

export const WHATNOT_STOCKS = {
  tiny: { width: 1, height: 0.5, padding: 0.02, name: '1" x 0.5"', driverSize: '25 x 13 mm' },
  fnsku: { width: 2, height: 1, padding: 0.04, name: '2" x 1"', driverSize: '51 x 25 mm' },
  show: { width: 3, height: 2, padding: 0.08, name: '3" x 2"', driverSize: '76 x 51 mm' },
};

export const BIN_LAYOUTS = {
  portrait: { width: 4, height: 6, name: '4" x 6"', orientation: 'Portrait', driverSize: '102 x 152 mm' },
  landscape: { width: 6, height: 4, name: '6" x 4"', orientation: 'Landscape', driverSize: '152 x 102 mm' },
};

export function clampNumber(value, min, max, fallback) {
  const parsed = parseFloat(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}
