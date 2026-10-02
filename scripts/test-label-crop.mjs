// Tests for the free "shipping label to 4x6" converter (public/js/label-crop).
// Run: node scripts/test-label-crop.mjs
import assert from 'node:assert/strict';
import * as PDFLib from 'pdf-lib';
import {
  PRESETS, OUTPUT_SIZES, presetRect, clampRect, rotateRectCW, displayRectToPdfBox,
  resolveRotation, fitPlacement, footprint, dragRect, normRot,
} from '../public/js/label-crop/geometry.js';
import { detectLabel } from '../public/js/label-crop/detect.js';
import { buildLabelPdf, pdfPageInfo } from '../public/js/label-crop/output.js';
import { LAYOUTS, layoutCells, cellToPage, cropPixels, slipRegion, planPage } from '../public/js/label-crop/layouts.js';
import { buildSamplePdf } from '../public/js/label-crop/sample.js';
import { friendlyError, LabelFileError } from '../public/js/label-crop/errors.js';
import { readPrefs, writePrefs, sanitizePrefs, PREF_DEFAULTS, PREF_KEY } from '../public/js/label-crop/prefs.js';
import { inflateSync } from 'node:zlib';

let passed = 0;
const near = (a, b, eps = 1e-6, msg = '') => assert.ok(Math.abs(a - b) <= eps, `${msg} expected ${b}, got ${a}`);
const nearRect = (a, b, eps = 1e-6) => { for (const k of Object.keys(b)) near(a[k], b[k], eps, k); };
async function test(name, fn) { await fn(); passed++; console.log(`ok - ${name}`); }

await test('output sizes are 4x6 in and 100x150 mm', () => {
  assert.equal(OUTPUT_SIZES['4x6'].width, 288);
  assert.equal(OUTPUT_SIZES['4x6'].height, 432);
  near(OUTPUT_SIZES['100x150'].width, 283.4646, 1e-3);
  near(OUTPUT_SIZES['100x150'].height, 425.1969, 1e-3);
});

await test('presets are inside the page and auto has no fixed rect', () => {
  assert.equal(presetRect('auto'), null);
  nearRect(presetRect('letter-top'), { x: 0, y: 0, w: 1, h: 0.5 });
  for (const id of Object.keys(PRESETS)) {
    const r = presetRect(id);
    if (!r) continue;
    assert.ok(r.x >= 0 && r.y >= 0 && r.x + r.w <= 1 && r.y + r.h <= 1, id);
  }
  const p = presetRect('letter-full'); p.w = 0; // returned copies must not alias the preset
  assert.equal(PRESETS['letter-full'].rect.w, 1);
});

await test('clampRect and dragRect keep the crop on the page', () => {
  nearRect(clampRect({ x: 0.9, y: -1, w: 0.5, h: 0.001 }), { x: 0.5, y: 0, w: 0.5, h: 0.02 });
  nearRect(dragRect({ x: 0.1, y: 0.1, w: 0.5, h: 0.5 }, 'move', 0.9, 0.9), { x: 0.5, y: 0.5, w: 0.5, h: 0.5 });
  nearRect(dragRect({ x: 0.1, y: 0.1, w: 0.5, h: 0.5 }, 'se', 0.1, -0.2), { x: 0.1, y: 0.1, w: 0.6, h: 0.3 });
  const tiny = dragRect({ x: 0.1, y: 0.1, w: 0.5, h: 0.5 }, 'nw', 1, 1);
  near(tiny.w, 0.02); near(tiny.h, 0.02);
});

await test('rotateRectCW round-trips and matches a 90° page turn', () => {
  const r = { x: 0.1, y: 0.2, w: 0.3, h: 0.4 };
  nearRect(rotateRectCW(r, 90), { x: 0.4, y: 0.1, w: 0.4, h: 0.3 });
  for (const d of [0, 90, 180, 270]) nearRect(rotateRectCW(rotateRectCW(r, d), 360 - d), r);
  nearRect(rotateRectCW(rotateRectCW(r, 90), 90), rotateRectCW(r, 180));
  assert.equal(normRot(-90), 270); assert.equal(normRot(450), 90);
});

await test('displayRectToPdfBox maps top half of letter to PDF user space', () => {
  const box = { x: 0, y: 0, width: 612, height: 792 };
  const b = displayRectToPdfBox({ x: 0, y: 0, w: 1, h: 0.5 }, box, 0);
  nearRect(b, { left: 0, bottom: 396, right: 612, top: 792 });
  // Offset CropBox
  const b2 = displayRectToPdfBox({ x: 0.5, y: 0.5, w: 0.5, h: 0.5 }, { x: 10, y: 20, width: 100, height: 200 }, 0);
  nearRect(b2, { left: 60, bottom: 20, right: 110, top: 120 });
  // A /Rotate 90 page: the displayed top half is the unrotated left half... of the right side.
  const b3 = displayRectToPdfBox({ x: 0, y: 0, w: 1, h: 0.5 }, { x: 0, y: 0, width: 612, height: 792 }, 90);
  nearRect(b3, { left: 0, bottom: 0, right: 306, top: 792 });
});

await test('auto rotation turns landscape crops to portrait', () => {
  assert.equal(resolveRotation('auto', 612, 396), 90);
  assert.equal(resolveRotation('auto', 288, 432), 0);
  assert.equal(resolveRotation('auto', 300, 300), 0);
  assert.equal(resolveRotation('180', 612, 396), 180);
});

await test('fitPlacement scales to fit, centres, and anchors every rotation', () => {
  for (const rot of [0, 90, 180, 270]) {
    const f = fitPlacement(612, 396, 288, 432, rot);
    const fp = footprint(f.x, f.y, f.width, f.height, f.rotateCCW);
    nearRect(fp, f.box, 1e-6);
    assert.ok(f.box.x >= -1e-9 && f.box.y >= -1e-9 && f.box.x + f.box.width <= 288 + 1e-9 && f.box.y + f.box.height <= 432 + 1e-9, `rot ${rot} inside`);
    near(f.box.x * 2 + f.box.width, 288, 1e-6); near(f.box.y * 2 + f.box.height, 432, 1e-6);
  }
  const f90 = fitPlacement(612, 396, 288, 432, 90);
  near(f90.scale, Math.min(288 / 396, 432 / 612)); // aspect preserved, fills one dimension
  const f0 = fitPlacement(612, 396, 288, 432, 0);
  near(f0.box.width, 288);
});

function syntheticPage(w, h, draw) {
  const data = new Uint8ClampedArray(w * h * 4).fill(255);
  const ink = (x, y) => { if (x < 0 || y < 0 || x >= w || y >= h) return; const p = (y * w + x) * 4; data[p] = data[p + 1] = data[p + 2] = 0; };
  draw(ink);
  return { data, width: w, height: h };
}
const strokeRect = (ink, x0, y0, x1, y1, t = 2) => {
  for (let x = x0; x <= x1; x++) for (let k = 0; k < t; k++) { ink(x, y0 + k); ink(x, y1 - k); }
  for (let y = y0; y <= y1; y++) for (let k = 0; k < t; k++) { ink(x0 + k, y); ink(x1 - k, y); }
};
const fillRect = (ink, x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) ink(x, y); };

await test('detect: framed label in the top half of a letter page', () => {
  // 612 x 792 at 1px/pt. Label frame 396 x 264 (6 x 4 in landscape), instructions below.
  const img = syntheticPage(612, 792, (ink) => {
    strokeRect(ink, 108, 60, 503, 323, 3);
    fillRect(ink, 150, 200, 450, 260); // barcode-ish block
    for (let y = 480; y < 700; y += 14) fillRect(ink, 60, y, 560, y + 4); // text lines
  });
  const res = detectLabel(img, { margin: 0 });
  assert.equal(res.method, 'frame');
  nearRect(res.rect, { x: 108 / 612, y: 60 / 792, w: 396 / 612, h: 264 / 792 }, 0.004);
  const padded = detectLabel(img, { margin: 0.01 }).rect;
  assert.ok(padded.x < res.rect.x && padded.w > res.rect.w);
});

await test('detect: unframed label falls back to the densest content band', () => {
  const img = syntheticPage(612, 792, (ink) => {
    fillRect(ink, 40, 40, 300, 120); fillRect(ink, 40, 140, 570, 340); // label content (dense)
    for (let y = 520; y < 600; y += 20) fillRect(ink, 60, y, 400, y + 1); // sparse notes below
  });
  const res = detectLabel(img, { margin: 0 });
  assert.equal(res.method, 'content');
  nearRect(res.rect, { x: 40 / 612, y: 40 / 792, w: 531 / 612, h: 301 / 792 }, 0.004);
});

await test('detect: blank page returns null; transparent pixels count as paper', () => {
  assert.equal(detectLabel(syntheticPage(100, 150, () => {})), null);
  const clear = { data: new Uint8ClampedArray(100 * 150 * 4), width: 100, height: 150 }; // all rgba(0,0,0,0)
  assert.equal(detectLabel(clear), null);
});

async function syntheticLetterPdf({ rotate = 0 } = {}) {
  const doc = await PDFLib.PDFDocument.create();
  const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
  for (let i = 0; i < 2; i++) {
    const page = doc.addPage([612, 792]);
    page.drawRectangle({ x: 108, y: 468, width: 396, height: 264, borderWidth: 3, borderColor: PDFLib.rgb(0, 0, 0) });
    page.drawText(`USPS GROUND ADVANTAGE ${i + 1}`, { x: 130, y: 690, size: 16, font });
    page.drawText('Cut along the line. Packing instructions below.', { x: 60, y: 300, size: 11, font });
    if (rotate) page.setRotation(PDFLib.degrees(rotate));
  }
  return doc.save();
}

await test('vector output: letter labels become 288 x 432 pt pages', async () => {
  const src = await PDFLib.PDFDocument.load(await syntheticLetterPdf());
  const jobs = [0, 1].map((pageIndex) => ({ kind: 'pdf', doc: src, pageIndex, rect: presetRect('letter-top'), rotation: 'auto' }));
  const { bytes, pages } = await buildLabelPdf(PDFLib, jobs, { size: '4x6' });
  assert.equal(pages, 2);
  const out = await PDFLib.PDFDocument.load(bytes);
  assert.equal(out.getPageCount(), 2);
  for (const p of out.getPages()) {
    const { width, height } = p.getSize();
    near(width, 288, 1e-6); near(height, 432, 1e-6);
  }
  const text = Buffer.from(bytes).toString('latin1');
  assert.match(text, /\/Subtype\s*\/Form/); // embedded as a vector form XObject
  assert.match(text, /\/BBox\s*\[\s*0\s+396\s+612\s+792\s*\]/);
  assert.ok(!/\/Subtype\s*\/Image/.test(text), 'no raster image in vector output');
});

await test('vector output: rotated source pages and 100x150 mm size', async () => {
  const src = await PDFLib.PDFDocument.load(await syntheticLetterPdf({ rotate: 90 }));
  const info = pdfPageInfo(src.getPage(0));
  assert.equal(info.pageRot, 90); near(info.dispW, 792); near(info.dispH, 612);
  const jobs = [{ kind: 'pdf', doc: src, pageIndex: 0, rect: { x: 0, y: 0, w: 1, h: 1 }, rotation: 'auto' }];
  const { bytes } = await buildLabelPdf(PDFLib, jobs, { size: '100x150' });
  const out = await PDFLib.PDFDocument.load(bytes);
  const { width, height } = out.getPage(0).getSize();
  near(width, 283.4646, 1e-3); near(height, 425.1969, 1e-3);
});

await test('image output: PNG embedded at native size on a 4x6 page', async () => {
  // 1x1 PNG is enough to prove embedding; real images keep their own pixels.
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  const { bytes } = await buildLabelPdf(PDFLib, [{ kind: 'image', bytes: new Uint8Array(png), format: 'png', width: 1, height: 1, rotation: 0 }]);
  const out = await PDFLib.PDFDocument.load(bytes);
  const { width, height } = out.getPage(0).getSize();
  assert.equal(width, 288); assert.equal(height, 432);
});

// --- multi-label sheets, packing slips, sample, errors, prefs -------------------------------

await test('layouts: cells tile the page exactly with no overlap', () => {
  for (const id of Object.keys(LAYOUTS)) {
    const cells = layoutCells(id);
    near(cells.reduce((a, c) => a + c.w * c.h, 0), 1, 1e-9, `${id} area`);
    for (let i = 0; i < cells.length; i++) for (let j = i + 1; j < cells.length; j++) {
      const a = cells[i], b = cells[j];
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      assert.ok(ox <= 1e-9 || oy <= 1e-9, `${id} cells ${i},${j} overlap`);
    }
  }
  assert.equal(layoutCells('four').length, 4);
  assert.equal(layoutCells('nope').length, 1);
  const c = layoutCells('four'); c[0].w = 9; assert.equal(LAYOUTS.four.cells[0].w, 0.5); // copies
});

await test('layouts: cellToPage and cropPixels agree on geometry', () => {
  nearRect(cellToPage({ x: 0.5, y: 0.5, w: 0.5, h: 0.5 }, { x: 0.2, y: 0.4, w: 0.6, h: 0.2 }), { x: 0.6, y: 0.7, w: 0.3, h: 0.1 });
  const img = syntheticPage(100, 200, (ink) => ink(75, 150));
  const sub = cropPixels(img, { x: 0.5, y: 0.5, w: 0.5, h: 0.5 });
  assert.equal(sub.width, 50); assert.equal(sub.height, 100);
  assert.equal(sub.data[((150 - 100) * 50 + (75 - 50)) * 4], 0, 'ink pixel kept at the mapped spot');
  assert.equal(sub.data[0], 255);
});

// A letter page at 1 px/pt with labels framed at the given page rects (pt, top-left origin).
const framedSheet = (frames) => syntheticPage(612, 792, (ink) => {
  for (const [x0, y0, x1, y1] of frames) { strokeRect(ink, x0, y0, x1, y1, 3); fillRect(ink, x0 + 30, y0 + 40, x1 - 30, y0 + 90); }
});
const planWith = (pixels, layout, extra = {}) => planPage({ pixels, layout, detect: (p) => detectLabel(p, { margin: 0 }), ...extra });

await test('multi-label: 2-up stacked sheet splits into two label crops', () => {
  const parts = planWith(framedSheet([[90, 40, 521, 327], [90, 436, 521, 723]]), 'two-stack');
  assert.equal(parts.length, 2);
  nearRect(parts[0].rect, { x: 90 / 612, y: 40 / 792, w: 432 / 612, h: 288 / 792 }, 0.005);
  nearRect(parts[1].rect, { x: 90 / 612, y: 436 / 792, w: 432 / 612, h: 288 / 792 }, 0.005);
  assert.ok(parts.every((p) => p.role === 'label'));
});

await test('multi-label: side-by-side and 4-up sheets; blank slots skipped', () => {
  const side = planWith(framedSheet([[20, 100, 291, 507], [326, 100, 597, 507]]), 'two-side');
  assert.equal(side.length, 2);
  near(side[1].rect.x, 326 / 612, 0.005); near(side[1].rect.w, 272 / 612, 0.005);
  const four = planWith(framedSheet([[30, 40, 280, 360], [336, 40, 586, 360], [30, 436, 280, 756]]), 'four');
  assert.equal(four.length, 3, 'fourth slot is blank on a partly used sheet');
  assert.deepEqual(four.map((p) => p.slot), [1, 2, 3]);
  for (const p of four) assert.ok(p.rect.w <= 0.5 + 1e-9 && p.rect.h <= 0.5 + 1e-9, 'crop stays in its slot');
  const fixed = planWith(framedSheet([[30, 40, 280, 360]]), 'four', { preset: 'letter-top', fixedRect: { x: 0, y: 0, w: 1, h: 0.5 } });
  assert.equal(fixed.length, 4, 'fixed preset keeps every slot');
  nearRect(fixed[3].rect, { x: 0.5, y: 0.5, w: 0.5, h: 0.5 });
  const blank = planWith(syntheticPage(612, 792, () => {}), 'four');
  assert.equal(blank.length, 1); nearRect(blank[0].rect, { x: 0, y: 0, w: 1, h: 1 });
});

await test('packing slip: slipRegion picks the largest leftover strip', () => {
  nearRect(slipRegion({ x: 0, y: 0, w: 1, h: 0.5 }), { x: 0, y: 0.5, w: 1, h: 0.5 });
  nearRect(slipRegion({ x: 0.1, y: 0.4, w: 0.8, h: 0.6 }), { x: 0, y: 0, w: 1, h: 0.4 });
  nearRect(slipRegion({ x: 0, y: 0, w: 0.45, h: 1 }), { x: 0.45, y: 0, w: 0.55, h: 1 });
  assert.equal(slipRegion({ x: 0, y: 0, w: 1, h: 1 }), null);
  assert.equal(slipRegion({ x: 0, y: 0, w: 1, h: 0.96 }), null);
});

await test('packing slip: dropped by default, own page on request, skipped when blank', () => {
  const sheet = syntheticPage(612, 792, (ink) => {
    strokeRect(ink, 90, 36, 521, 323, 3); fillRect(ink, 120, 200, 480, 260);
    for (let y = 460; y < 620; y += 16) fillRect(ink, 72, y, 540, y + 5); // slip text lines
  });
  assert.equal(planWith(sheet, 'single').length, 1);
  const kept = planWith(sheet, 'single', { slip: 'page' });
  assert.deepEqual(kept.map((p) => p.role), ['label', 'slip']);
  const s = kept[1].rect;
  assert.ok(s.y >= kept[0].rect.y + kept[0].rect.h - 1e-9, 'slip sits below the label');
  near(s.y, 460 / 792, 0.01); near(s.x, 72 / 612, 0.01);
  const noSlip = framedSheet([[90, 36, 521, 323]]);
  assert.equal(planWith(noSlip, 'single', { slip: 'page' }).length, 1, 'blank remainder adds no page');
  assert.equal(planWith(sheet, 'two-stack', { slip: 'page' }).every((p) => p.role === 'label'), true);
});

const pdfText = (bytes) => {
  // pdf-lib may Flate-compress streams; inflate any we find so drawn text can be searched.
  const raw = Buffer.from(bytes).toString('latin1');
  let out = raw;
  for (const m of raw.matchAll(/stream\r?\n([\s\S]*?)endstream/g)) { try { out += inflateSync(Buffer.from(m[1], 'latin1')).toString('latin1'); } catch { /* not flate */ } }
  return out;
};
const hasText = (txt, s) => txt.includes(s) || txt.toUpperCase().includes(Buffer.from(s, 'latin1').toString('hex').toUpperCase());

await test('sample: generator makes a valid letter PDF marked SAMPLE ONLY', async () => {
  const bytes = await buildSamplePdf(PDFLib);
  assert.equal(Buffer.from(bytes.slice(0, 5)).toString('latin1'), '%PDF-');
  const doc = await PDFLib.PDFDocument.load(bytes);
  assert.equal(doc.getPageCount(), 1);
  const { width, height } = doc.getPage(0).getSize();
  assert.equal(width, 612); assert.equal(height, 792);
  const txt = pdfText(bytes);
  assert.ok(hasText(txt, 'SAMPLE ONLY - NOT A REAL LABEL'), 'sample marking present');
  assert.ok(hasText(txt, 'PACKING SLIP (SAMPLE ONLY)'), 'slip present');
  for (const layout of ['two-stack', 'two-side', 'four']) {
    const d = await PDFLib.PDFDocument.load(await buildSamplePdf(PDFLib, { layout }));
    assert.equal(d.getPageCount(), 1, layout);
  }
});

await test('sample: converts to 288 x 432 pt vector pages (label + slip)', async () => {
  const src = await PDFLib.PDFDocument.load(await buildSamplePdf(PDFLib));
  const label = { x: 90 / 612, y: 36 / 792, w: 432 / 612, h: 288 / 792 };
  const slip = slipRegion(label);
  const jobs = [{ kind: 'pdf', doc: src, pageIndex: 0, rect: label, rotation: 'auto' }, { kind: 'pdf', doc: src, pageIndex: 0, rect: slip, rotation: 'auto' }];
  const { bytes, pages } = await buildLabelPdf(PDFLib, jobs, { size: '4x6' });
  assert.equal(pages, 2);
  const out = await PDFLib.PDFDocument.load(bytes);
  for (const p of out.getPages()) { const { width, height } = p.getSize(); near(width, 288); near(height, 432); }
});

await test('errors: plain-language messages for common failures', () => {
  assert.match(friendlyError({ name: 'PasswordException', message: 'No password given' }, 'label.pdf'), /label\.pdf is password-protected.*without the password/);
  assert.match(friendlyError(new LabelFileError('unsupported', 'label.heic'), 'label.heic'), /HEIC file\. Add a PDF, PNG or JPG/);
  assert.match(friendlyError({ name: 'InvalidPDFException', message: 'Invalid PDF structure.' }, 'x.pdf'), /does not open as a PDF/);
  assert.match(friendlyError(new LabelFileError('too-big', 'big.pdf'), 'big.pdf'), /larger than 80 MB/);
  assert.match(friendlyError(new LabelFileError('empty', 'e.pdf'), 'e.pdf'), /empty/);
  assert.match(friendlyError(new Error('boom'), 'z.pdf'), /Could not open z\.pdf.*boom/);
});

await test('prefs: sanitized round trip; broken storage falls back to defaults', () => {
  const mem = new Map();
  const store = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)) };
  assert.deepEqual(readPrefs(store), PREF_DEFAULTS);
  assert.equal(writePrefs({ preset: 'letter-top', layout: 'four', slip: 'page', rotate: '90', size: '100x150' }, store), true);
  assert.deepEqual(readPrefs(store), { preset: 'letter-top', layout: 'four', slip: 'page', rotate: '90', size: '100x150' });
  mem.set(PREF_KEY, '{not json');
  assert.deepEqual(readPrefs(store), PREF_DEFAULTS);
  assert.deepEqual(sanitizePrefs({ preset: '<script>', size: '4x6', extra: 1 }), PREF_DEFAULTS);
  const throwing = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  assert.deepEqual(readPrefs(throwing), PREF_DEFAULTS);
  assert.equal(writePrefs(PREF_DEFAULTS, throwing), false);
  assert.deepEqual(readPrefs(null), PREF_DEFAULTS);
});

console.log(`\n${passed} tests passed`);
