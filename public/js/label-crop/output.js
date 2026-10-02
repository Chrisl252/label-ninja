// Build the 4x6 output PDF with pdf-lib. One label per page, scaled to fit and centred.
// PDF sources are embedded as vector form XObjects clipped to the crop box (no rasterizing);
// images are embedded at their full pixel resolution. pdf-lib is injected so Node tests and
// the browser share this file.

import { OUTPUT_SIZES, displayRectToPdfBox, rectSizePt, resolveRotation, fitPlacement, normRot } from './geometry.js';

/**
 * jobs: array of
 *   { kind: 'pdf', doc: <pdf-lib PDFDocument>, pageIndex, rect, rotation }
 *   { kind: 'image', bytes: Uint8Array, format: 'png' | 'jpg', width, height, rotation }
 * rect is the normalized crop on the displayed page; rotation is 'auto' or 0/90/180/270 (cw).
 * Returns { bytes: Uint8Array, pages: number }.
 */
export async function buildLabelPdf(PDFLib, jobs, { size = '4x6', margin = 0, title = 'Shipping labels 4x6' } = {}) {
  const out = OUTPUT_SIZES[size] || OUTPUT_SIZES['4x6'];
  const doc = await PDFLib.PDFDocument.create();
  doc.setTitle(title);
  doc.setCreator('Label Ninja shipping label to 4x6 converter');
  doc.setProducer('Label Ninja (in-browser, pdf-lib)');

  for (const job of jobs) {
    const page = doc.addPage([out.width, out.height]);
    if (job.kind === 'pdf') await placePdfJob(PDFLib, doc, page, job, out, margin);
    else await placeImageJob(PDFLib, doc, page, job, out, margin);
  }
  const bytes = await doc.save();
  return { bytes, pages: jobs.length };
}

/** Facts about a source page that the crop UI and output both need. */
export function pdfPageInfo(srcPage) {
  const box = srcPage.getCropBox();
  const pageRot = normRot(srcPage.getRotation().angle || 0);
  const turned = pageRot === 90 || pageRot === 270;
  return { box, pageRot, dispW: turned ? box.height : box.width, dispH: turned ? box.width : box.height };
}

async function placePdfJob(PDFLib, doc, page, job, out, margin) {
  const src = job.doc.getPage(job.pageIndex);
  const info = pdfPageInfo(src);
  const rect = job.rect || { x: 0, y: 0, w: 1, h: 1 };
  const shown = rectSizePt(rect, info.dispW, info.dispH);
  const userRot = resolveRotation(job.rotation, shown.width, shown.height);
  const totalRot = (info.pageRot + userRot) % 360;
  const embedded = await doc.embedPage(src, displayRectToPdfBox(rect, info.box, info.pageRot));
  const fit = fitPlacement(embedded.width, embedded.height, out.width, out.height, totalRot, margin);
  page.drawPage(embedded, {
    x: fit.x, y: fit.y, xScale: fit.scale, yScale: fit.scale, rotate: PDFLib.degrees(fit.rotateCCW),
  });
  return fit;
}

async function placeImageJob(PDFLib, doc, page, job, out, margin) {
  const img = job.format === 'jpg' ? await doc.embedJpg(job.bytes) : await doc.embedPng(job.bytes);
  const userRot = resolveRotation(job.rotation, img.width, img.height);
  const fit = fitPlacement(img.width, img.height, out.width, out.height, userRot, margin);
  page.drawImage(img, { x: fit.x, y: fit.y, width: fit.width, height: fit.height, rotate: PDFLib.degrees(fit.rotateCCW) });
  return fit;
}
