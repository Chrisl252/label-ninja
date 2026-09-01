// verify-pdf.mjs — print page count + exact page dimensions from a PDF file.
// Usage: node scripts/verify-pdf.mjs <file.pdf> [expectedWidthPt expectedHeightPt expectedPages]
// When expectations are given, exits 1 on mismatch (tolerance 0.5pt).

import { readFileSync } from 'fs';
import { PDFDocument } from 'pdf-lib';

const [file, ew, eh, ep] = process.argv.slice(2);
if (!file) {
  console.error('usage: node scripts/verify-pdf.mjs <file.pdf> [expectedWidthPt expectedHeightPt expectedPages]');
  process.exit(2);
}
const doc = await PDFDocument.load(readFileSync(file));
const pages = doc.getPages();
console.log(`${file}: pages=${pages.length}`);
let ok = true;
pages.forEach((p, i) => {
  const { width, height } = p.getSize();
  console.log(`  page ${i + 1}: ${width.toFixed(2)} x ${height.toFixed(2)} pt  (${(width / 72).toFixed(3)} x ${(height / 72).toFixed(3)} in)`);
});
if (ew !== undefined && eh !== undefined) {
  const w = Number(ew);
  const h = Number(eh);
  const pass = pages.every((p) => {
    const s = p.getSize();
    return Math.abs(s.width - w) <= 0.5 && Math.abs(s.height - h) <= 0.5;
  });
  console.log(`  dimension check: expect ${w.toFixed(2)} x ${h.toFixed(2)} pt -> ${pass ? 'PASS' : 'FAIL'}`);
  ok = ok && pass;
}
if (ep !== undefined) {
  const pass = pages.length === Number(ep);
  console.log(`  page-count check: expect ${ep} -> ${pass ? 'PASS' : 'FAIL'}`);
  ok = ok && pass;
}
process.exit(ok ? 0 : 1);
