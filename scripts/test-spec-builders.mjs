// test-spec-builders.mjs — unit proof for the pure spec builders + hash routing.
// DOM-free by contract: imports public/js/app/spec-builders.js + guides.js only.
// Usage: node scripts/test-spec-builders.mjs

import {
  buildBinSpec, buildWhatnotSpec, buildFnskuSpec, buildEditorSpec,
  buildTestPrintJob, binTitleSizeIn, whatnotFontSizeIn, parseDataUrl,
} from '../public/js/app/spec-builders.js';
import { modeFromHash, sectionIdFromHash } from '../public/js/app/guides.js';

let failures = 0;

function assert(cond, label) {
  if (cond) {
    console.log(`PASS ${label}`);
  } else {
    failures += 1;
    console.error(`FAIL ${label}`);
  }
}

function assertClose(actual, expected, tol, label) {
  assert(Math.abs(actual - expected) <= tol, `${label} (got ${actual}, want ${expected}±${tol})`);
}

function assertSpecCoords(spec) {
  for (const [pi, page] of spec.pages.entries()) {
    for (const [ei, el] of page.elements.entries()) {
      for (const key of ['x_in', 'y_in']) {
        if (el[key] === undefined) continue;
        if (!(el[key] >= 0 && el[key] <= page.width_in && el[key] <= page.height_in)) {
          return false;
        }
      }
      if (el.type === 'text' && !(el.font_size_pt > 0 && el.font_size_pt <= 400)) return false;
      if (el.type === 'barcode' && !(el.w_in > 0 && el.h_in > 0)) return false;
      void pi; void ei;
    }
  }
  return true;
}

// ---- bin (A1-A3, portrait 4x6) ----
const binSpec = buildBinSpec({
  prefix: 'BIN ', shelf: 'A', start: 1, end: 3,
  width: 4, height: 6, orientation: 'Portrait', padding: 0.18,
  titleSize: 0.72, barcodeHeight: 2.45, showValue: true,
});
assert(binSpec.tool === 'bin', 'bin: tool');
assert(binSpec.pages.length === 3, 'bin: 3 pages (A1-A3)');
assertClose(binSpec.pages[0].width_in, 4, 1e-9, 'bin: page width_in = 4');
assertClose(binSpec.pages[0].height_in, 6, 1e-9, 'bin: page height_in = 6');
assert(binSpec.pages[0].elements.length === 2, 'bin: 2 elements per page (text + barcode)');
assert(binSpec.pages[0].elements[0].text === 'BIN 1A', 'bin: page 1 title text BIN 1A');
assert(binSpec.pages[2].elements[0].text === 'BIN 3A', 'bin: page 3 title text BIN 3A');
assert(binSpec.pages[1].elements[1].value === 'BIN-2A', 'bin: barcode value BIN-2A (spaces dashed)');
assert(binSpec.pages[0].elements[1].subtype === 'code128', 'bin: barcode subtype code128');
assert(binSpec.pages[0].elements[1].show_text === true, 'bin: show_text from checkbox');
assertClose(binSpec.pages[0].elements[0].font_size_pt, 0.72 * 72, 1e-6, 'bin: title font 0.72in -> 51.84pt');
assert(assertSpecCoords(binSpec), 'bin: all coords in [0, page dims], fonts in (0,400]pt');

// bin landscape title shrink
assertClose(binTitleSizeIn('BIN 100A', { orientation: 'Landscape', width: 6, titleSize: 0.72 }), Math.min(0.72, (6 * 0.88) / (7 * 0.56)), 1e-9, 'bin: landscape title shrink formula');

// ---- whatnot (#1-#2, tiny 1x0.5 stock) ----
const wnSpec = buildWhatnotSpec({ prefix: '#', start: 1, end: 2, width: 1, height: 0.5, padding: 0.02 });
assert(wnSpec.tool === 'whatnot', 'whatnot: tool');
assert(wnSpec.pages.length === 2, 'whatnot: 2 pages');
assertClose(wnSpec.pages[0].width_in, 1, 1e-9, 'whatnot: page width_in = 1');
assertClose(wnSpec.pages[0].height_in, 0.5, 1e-9, 'whatnot: page height_in = 0.5');
assert(wnSpec.pages[0].elements.length === 1, 'whatnot: text-only page');
assert(wnSpec.pages[0].elements[0].text === '#1', 'whatnot: page 1 text #1');
assert(wnSpec.pages[1].elements[0].text === '#2', 'whatnot: page 2 text #2');
assert(wnSpec.pages[0].elements[0].align === 'center', 'whatnot: centered');
assertClose(wnSpec.pages[0].elements[0].font_size_pt, whatnotFontSizeIn('#1', { width: 1, height: 0.5 }) * 72, 1e-6, 'whatnot: font pt = fitted inches * 72');
assert(assertSpecCoords(wnSpec), 'whatnot: coords in range');

// ---- fnsku sample ----
const fnskuSpec = buildFnskuSpec({ value: 'X001ABC123', title: 'Wireless Bluetooth Earbuds', condition: 'New' });
assert(fnskuSpec.tool === 'fnsku', 'fnsku: tool');
assertClose(fnskuSpec.pages[0].width_in, 2, 1e-9, 'fnsku: 2in wide');
assertClose(fnskuSpec.pages[0].height_in, 1, 1e-9, 'fnsku: 1in tall');
assert(fnskuSpec.pages[0].elements.length === 3, 'fnsku: title + barcode + condition');
assert(fnskuSpec.pages[0].elements[1].value === 'X001ABC123', 'fnsku: barcode value');
assert(fnskuSpec.pages[0].elements[1].show_text === true, 'fnsku: barcode shows value');
assert(assertSpecCoords(fnskuSpec), 'fnsku: coords in range');
let threwNonAscii = false;
try {
  buildFnskuSpec({ value: 'X00→1', title: '', condition: '' });
} catch {
  threwNonAscii = true;
}
assert(threwNonAscii, 'fnsku: non-ASCII barcode value throws');

// ---- editor (text + barcode + box + png image on the standard preset) ----
const PNG_1PX = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const preset = { width: 360, height: 200, printWidth: 2.25, printHeight: 1.25 };
const edSpec = buildEditorSpec({
  preset,
  elements: [
    { id: 'el-1', type: 'text', x: 25, y: 20, text: 'HELLO', fontSize: 24, align: 'center', bold: true },
    { id: 'el-2', type: 'barcode', x: 60, y: 75, text: 'BIN-1A', fontSize: 14, width: 120 },
    { id: 'el-3', type: 'box', x: 25, y: 50, text: 'BOXED', fontSize: 16, width: 120, align: 'center', bold: true },
    { id: 'el-4', type: 'image', x: 10, y: 10, width: 40, aspectRatio: 1, src: `data:image/png;base64,${PNG_1PX}`, text: 'dot.png' },
  ],
});
assert(edSpec.tool === 'editor', 'editor: tool');
assertClose(edSpec.pages[0].width_in, 2.25, 1e-9, 'editor: page width from preset');
assertClose(edSpec.pages[0].height_in, 1.25, 1e-9, 'editor: page height from preset');
assert(edSpec.pages[0].elements.length === 5, 'editor: 5 spec elements (text + barcode + box->rect+text + image)');
const edText = edSpec.pages[0].elements[0];
assertClose(edText.x_in, (25 / 360) * 2.25, 1e-4, 'editor: text x_in = x/width_px*printWidth_in');
assertClose(edText.font_size_pt, 24 * (2.25 * 72 / 360), 1e-6, 'editor: font px -> pt via preset scale');
const edBarcode = edSpec.pages[0].elements.find((e) => e.type === 'barcode');
assert(edBarcode.value === 'BIN-1A', 'editor: barcode value from element text');
const edRects = edSpec.pages[0].elements.filter((e) => e.type === 'rect');
assert(edRects.length === 1 && edRects[0].stroke === '#000000', 'editor: box -> stroked rect');
const edImage = edSpec.pages[0].elements.find((e) => e.type === 'image');
assert(edImage.mime === 'image/png', 'editor: image mime from dataURL');
assert(edImage.data_base64 === PNG_1PX, 'editor: dataURL prefix stripped');
assertClose(edImage.w_in, (40 / 360) * 2.25, 1e-6, 'editor: image width px -> in');
assert(assertSpecCoords(edSpec), 'editor: coords in range');

// webp guard
let threwWebp = false;
try {
  buildEditorSpec({ preset, elements: [{ type: 'image', x: 1, y: 1, width: 40, aspectRatio: 1, src: 'data:image/webp;base64,AAAA' }] });
} catch (e) {
  threwWebp = e.message === 'webp_image';
}
assert(threwWebp, 'editor: webp src throws (converter must run first)');

// parseDataUrl sanity
assert(parseDataUrl('data:image/jpeg;base64,/9j/4AAQ').mime === 'image/jpeg', 'parseDataUrl: jpeg');
assert(parseDataUrl('data:image/gif;base64,R0lGOD') === null, 'parseDataUrl: non-png/jpeg/webp rejected');

// ---- test print ----
const tp = buildTestPrintJob(4, 6);
assert(tp.tool === 'test_print', 'test_print: tool');
assertClose(tp.settings.width_in, 4, 1e-9, 'test_print: width_in');
assertClose(tp.settings.height_in, 6, 1e-9, 'test_print: height_in');
assert(!('pages' in tp) || tp.pages == null, 'test_print: no pages (server renders)');

// ---- hash routing (7 guide hashes + tool hashes) ----
const guideHashes = [
  '#printer-setup-checklist',
  '#best-label-printers',
  '#seo-keywords',
  '#rollo-setup',
  '#zebra-setup',
  '#dymo-setup',
  '#pricing',
];
for (const h of guideHashes) {
  assert(modeFromHash(h) === 'guides', `routing: ${h} -> guides`);
}
assert(modeFromHash('#tools/warehouse-rack-bin-label-generator') === 'bin', 'routing: bin tool hash');
assert(modeFromHash('#tools/whatnot-live-show-number-generator') === 'whatnot', 'routing: whatnot tool hash');
assert(modeFromHash('#tools/amazon-fba-fnsku-generator') === 'fnsku', 'routing: fnsku tool hash');
assert(modeFromHash('') === 'editor', 'routing: no hash -> editor');
assert(sectionIdFromHash('#best-label-printers') === 'best-label-printers', 'routing: scroll target extracted');
assert(sectionIdFromHash('#tools/warehouse-rack-bin-label-generator') === null, 'routing: tool hash has no guide section');

console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL SPEC-BUILDER TESTS PASSED');
process.exit(failures ? 1 : 0);
