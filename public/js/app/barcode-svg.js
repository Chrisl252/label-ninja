// Barcode preview — CODE128 (Code Set B) drawn as same-origin vector SVG for
// on-screen previews (editor barcode elements, bin and FNSKU samples). The
// exported PDF is drawn by the server (src/code128.js uses the same table);
// this module only replaces the old third-party preview script.
// encodeBars/barcodePathData are DOM-free and node-testable.

const PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
];
const START_B = 104;
const STOP = 106;
const SVG_NS = 'http://www.w3.org/2000/svg';

export const PRINTABLE_ASCII = /^[\x20-\x7e]+$/;

// Bar/space widths in modules, or null when the value cannot be encoded.
export function encodeBars(value) {
  const text = String(value ?? '');
  if (!text || !PRINTABLE_ASCII.test(text)) return null;
  const values = [START_B];
  for (const ch of text) values.push(ch.charCodeAt(0) - 32);
  let checksum = START_B;
  values.slice(1).forEach((v, i) => { checksum += v * (i + 1); });
  values.push(checksum % 103, STOP);
  const bars = [];
  let total = 0;
  for (const v of values) {
    for (let i = 0; i < PATTERNS[v].length; i++) {
      const width = PATTERNS[v].charCodeAt(i) - 48;
      bars.push({ bar: i % 2 === 0, x: total, width });
      total += width;
    }
  }
  return { bars, total };
}

// One path for every bar; x in modules * moduleWidth, y in `height` units.
export function barcodePathData(value, height = 50, moduleWidth = 1) {
  const encoded = encodeBars(value);
  if (!encoded) return null;
  const m = moduleWidth;
  const d = encoded.bars.filter((b) => b.bar).map((b) => `M${b.x * m} 0h${b.width * m}v${height}h-${b.width * m}z`).join('');
  return { d, width: encoded.total * m, height };
}

// Fill an <svg> element with a barcode (and optional human-readable text).
// Returns false and leaves the svg empty when the value is not encodable.
export function renderBarcodeSvg(svg, value, { height = 50, showText = true, fontSize = 13, moduleWidth = 2 } = {}) {
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  const data = barcodePathData(value, height, moduleWidth);
  if (!data) return false;
  const textH = showText ? fontSize + 4 : 0;
  svg.setAttribute('viewBox', `0 0 ${data.width} ${height + textH}`);
  svg.setAttribute('width', String(data.width));
  svg.setAttribute('height', String(height + textH));
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `Barcode ${value}`);
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', data.d);
  path.setAttribute('fill', 'currentColor');
  svg.appendChild(path);
  if (showText) {
    const text = document.createElementNS(SVG_NS, 'text');
    text.setAttribute('x', String(data.width / 2));
    text.setAttribute('y', String(height + fontSize + 1));
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('font-size', String(fontSize));
    text.setAttribute('font-weight', '700');
    text.setAttribute('font-family', 'Arial, Helvetica, sans-serif');
    text.setAttribute('fill', 'currentColor');
    text.textContent = String(value);
    svg.appendChild(text);
  }
  return true;
}
