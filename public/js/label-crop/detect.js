// Auto-detect the label on a rasterized page. Pure: takes RGBA pixels, returns a normalized
// {x, y, w, h} rect (top-left origin) or null when the page is blank. Tested in Node.
//
// Strategy: 1) look for a large bordered rectangle with a shipping-label shape (most carrier
// labels print an outer frame); 2) otherwise split the page into bands of ink separated by
// white gaps and keep the band with the most ink (barcodes are dense), cropped to its content.

const LUMA_DARK = 200;     // 0-255; below this a pixel counts as ink
const LINE_MIN = 0.25;     // horizontal border must span this share of the page width
const SIDE_FILL = 0.85;    // vertical border must be this solid between the two lines
const LABEL_ASPECT = [1.3, 1.8]; // long side / short side for a framed 4x6-ish label
const MIN_FRAME_AREA = 0.08;     // framed rect must cover this share of the page

export function inkMask({ data, width, height }, threshold = LUMA_DARK) {
  const mask = new Uint8Array(width * height);
  for (let i = 0, p = 0; i < mask.length; i++, p += 4) {
    if (data[p + 3] < 128) continue; // transparent = paper
    const luma = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
    if (luma < threshold) mask[i] = 1;
  }
  return mask;
}

function horizontalLines(mask, w, h) {
  const rows = [];
  const minRun = Math.max(8, Math.floor(w * LINE_MIN));
  for (let y = 0; y < h; y++) {
    let best = 0, bestX0 = 0, run = 0, x0 = 0;
    const off = y * w;
    for (let x = 0; x <= w; x++) {
      if (x < w && mask[off + x]) { if (!run) x0 = x; run++; }
      else { if (run > best) { best = run; bestX0 = x0; } run = 0; }
    }
    if (best >= minRun) rows.push({ y, x0: bestX0, x1: bestX0 + best - 1 });
  }
  // Collapse thick lines (consecutive rows with the same extent) into one line.
  const lines = [];
  const tol = Math.max(2, Math.round(w * 0.01));
  for (const r of rows) {
    const last = lines[lines.length - 1];
    if (last && r.y - last.y1 <= 2 && Math.abs(r.x0 - last.x0) <= tol && Math.abs(r.x1 - last.x1) <= tol) {
      last.y1 = r.y;
    } else {
      lines.push({ y0: r.y, y1: r.y, x0: r.x0, x1: r.x1 });
    }
  }
  return lines.slice(0, 80);
}

function columnFill(mask, w, x, yA, yB) {
  let best = 0;
  for (let cx = Math.max(0, x - 3); cx <= Math.min(w - 1, x + 3); cx++) {
    let n = 0;
    for (let y = yA; y <= yB; y++) n += mask[y * w + cx];
    best = Math.max(best, n / Math.max(1, yB - yA + 1));
  }
  return best;
}

/** Largest rectangle framed by two matching horizontal lines and two solid vertical sides. */
export function findFrame(mask, w, h) {
  const lines = horizontalLines(mask, w, h);
  const tol = Math.max(3, Math.round(w * 0.02));
  let best = null;
  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      const a = lines[i], b = lines[j];
      if (b.y1 - a.y0 < h * 0.1) continue;
      if (Math.abs(a.x0 - b.x0) > tol || Math.abs(a.x1 - b.x1) > tol) continue;
      const x0 = Math.min(a.x0, b.x0), x1 = Math.max(a.x1, b.x1);
      const area = (x1 - x0 + 1) * (b.y1 - a.y0 + 1);
      if (best && area <= best.area) continue;
      if (columnFill(mask, w, x0, a.y0, b.y1) < SIDE_FILL) continue;
      if (columnFill(mask, w, x1, a.y0, b.y1) < SIDE_FILL) continue;
      best = { x0, y0: a.y0, x1, y1: b.y1, area };
    }
  }
  return best;
}

/** Rows of ink separated by white gaps; returns the band with the most ink, cropped to content. */
export function densestBand(mask, w, h) {
  const rowInk = new Uint32Array(h);
  for (let y = 0; y < h; y++) {
    let n = 0;
    for (let x = 0, off = y * w; x < w; x++) n += mask[off + x];
    rowInk[y] = n >= 2 ? n : 0; // ignore single-pixel specks
  }
  const gap = Math.max(4, Math.round(h * 0.025));
  const bands = [];
  let cur = null, white = 0;
  for (let y = 0; y < h; y++) {
    if (rowInk[y]) {
      if (!cur) cur = { y0: y, y1: y, ink: 0 };
      cur.y1 = y; cur.ink += rowInk[y]; white = 0;
    } else if (cur && ++white >= gap) { bands.push(cur); cur = null; white = 0; }
  }
  if (cur) bands.push(cur);
  if (!bands.length) return null;
  const band = bands.reduce((a, b) => (b.ink > a.ink ? b : a));
  let x0 = w, x1 = -1;
  for (let y = band.y0; y <= band.y1; y++) {
    if (!rowInk[y]) continue;
    const off = y * w;
    for (let x = 0; x < w; x++) if (mask[off + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; }
  }
  return x1 < 0 ? null : { x0, y0: band.y0, x1, y1: band.y1 };
}

function isLabelShaped(f, w, h) {
  const fw = f.x1 - f.x0 + 1, fh = f.y1 - f.y0 + 1;
  const aspect = Math.max(fw, fh) / Math.max(1, Math.min(fw, fh));
  return aspect >= LABEL_ASPECT[0] && aspect <= LABEL_ASPECT[1] && (fw * fh) / (w * h) >= MIN_FRAME_AREA;
}

/**
 * Detect the label. `image` = {data: RGBA, width, height}. `margin` is added on every side as
 * a fraction of the page's longer side. Returns {rect, method} or null for a blank page.
 */
export function detectLabel(image, { margin = 0.01, threshold = LUMA_DARK } = {}) {
  const { width: w, height: h } = image;
  const mask = inkMask(image, threshold);
  let found = findFrame(mask, w, h);
  let method = 'frame';
  if (!found || !isLabelShaped(found, w, h)) { found = densestBand(mask, w, h); method = 'content'; }
  if (!found) return null;
  const rect = { x: found.x0 / w, y: found.y0 / h, w: (found.x1 - found.x0 + 1) / w, h: (found.y1 - found.y0 + 1) / h };
  const mx = margin * Math.max(w, h) / w, my = margin * Math.max(w, h) / h;
  const x0 = Math.max(0, rect.x - mx), y0 = Math.max(0, rect.y - my);
  const x1 = Math.min(1, rect.x + rect.w + mx), y1 = Math.min(1, rect.y + rect.h + my);
  return { rect: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, method };
}
