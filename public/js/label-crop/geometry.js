// Pure crop/fit/rotate math for the 4x6 converter. No DOM, no libraries: unit-tested in Node.
// Rects are normalized to the displayed page: {x, y, w, h} in 0..1, origin at the TOP-LEFT.
// Rotations are degrees CLOCKWISE as the user sees them (0, 90, 180, 270).

export const PT_PER_IN = 72;
export const PT_PER_MM = 72 / 25.4;

export const OUTPUT_SIZES = {
  '4x6': { id: '4x6', label: '4 × 6 in', width: 4 * PT_PER_IN, height: 6 * PT_PER_IN },
  '100x150': { id: '100x150', label: '100 × 150 mm', width: 100 * PT_PER_MM, height: 150 * PT_PER_MM },
};

// Starting points, not guarantees: every layout can be fine-tuned with the crop box.
export const PRESETS = {
  auto: { id: 'auto', label: 'Auto-detect the label', rect: null },
  'letter-top': { id: 'letter-top', label: 'Letter page, label in top half', rect: { x: 0, y: 0, w: 1, h: 0.5 } },
  'letter-full': { id: 'letter-full', label: 'Letter page, full page label', rect: { x: 0, y: 0, w: 1, h: 1 } },
  'amazon-return': { id: 'amazon-return', label: 'Amazon return label (letter)', rect: { x: 0, y: 0, w: 1, h: 0.55 } },
  'a4-top': { id: 'a4-top', label: 'A4 page, label in top half', rect: { x: 0, y: 0, w: 1, h: 0.5 } },
};

export const MIN_CROP = 0.02; // smallest crop side as a fraction of the page

export function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

export function normRot(deg) { return ((Math.round(deg / 90) * 90) % 360 + 360) % 360; }

/** Keep a rect inside the unit page and at least MIN_CROP on each side. */
export function clampRect(r) {
  const w = clamp(r.w, MIN_CROP, 1);
  const h = clamp(r.h, MIN_CROP, 1);
  return { x: clamp(r.x, 0, 1 - w), y: clamp(r.y, 0, 1 - h), w, h };
}

export function presetRect(id) {
  const p = PRESETS[id];
  return p && p.rect ? { ...p.rect } : null;
}

/** Grow a rect by `m` (fraction of page) on every side, clamped to the page. */
export function padRect(r, m) {
  const x0 = clamp(r.x - m, 0, 1), y0 = clamp(r.y - m, 0, 1);
  const x1 = clamp(r.x + r.w + m, 0, 1), y1 = clamp(r.y + r.h + m, 0, 1);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/**
 * Where a normalized rect lands after the whole page turns `deg` clockwise.
 * 90 cw maps a point (u, v) to (1 - v, u).
 */
export function rotateRectCW(r, deg) {
  switch (normRot(deg)) {
    case 90: return { x: 1 - (r.y + r.h), y: r.x, w: r.h, h: r.w };
    case 180: return { x: 1 - (r.x + r.w), y: 1 - (r.y + r.h), w: r.w, h: r.h };
    case 270: return { x: r.y, y: 1 - (r.x + r.w), w: r.h, h: r.w };
    default: return { ...r };
  }
}

/**
 * Convert a crop drawn on the displayed page into PDF user-space coordinates for pdf-lib's
 * embedPage bounding box. `box` is the page CropBox {x, y, width, height} in points, unrotated;
 * `pageRot` is the page's own /Rotate (cw). Returns {left, bottom, right, top}.
 */
export function displayRectToPdfBox(rect, box, pageRot) {
  const u = rotateRectCW(rect, 360 - normRot(pageRot)); // undo the page's display rotation
  const left = box.x + u.x * box.width;
  const top = box.y + box.height - u.y * box.height;
  return { left, bottom: top - u.h * box.height, right: left + u.w * box.width, top };
}

/** Size in points of a displayed rect on a displayed page of dispW x dispH points. */
export function rectSizePt(rect, dispW, dispH) {
  return { width: rect.w * dispW, height: rect.h * dispH };
}

/**
 * Resolve the user's rotation choice. 'auto' turns a landscape crop 90° so it fills a portrait
 * 4x6; a portrait or square crop stays upright.
 */
export function resolveRotation(choice, widthPt, heightPt) {
  if (choice === 'auto' || choice == null) return widthPt > heightPt * 1.02 ? 90 : 0;
  return normRot(Number(choice));
}

/**
 * Scale-to-fit and centre content of contentW x contentH (pt, before rotation) on an output
 * page, after turning it `rotCW` degrees. Returns the scale, the footprint box and the pdf-lib
 * drawPage/drawImage anchor (x, y, rotate counter-clockwise) that produces it.
 */
export function fitPlacement(contentW, contentH, outW, outH, rotCW = 0, margin = 0) {
  const rot = normRot(rotCW);
  const turned = rot === 90 || rot === 270;
  const fw = turned ? contentH : contentW;
  const fh = turned ? contentW : contentH;
  const availW = Math.max(1, outW - 2 * margin), availH = Math.max(1, outH - 2 * margin);
  const scale = Math.min(availW / fw, availH / fh);
  const boxW = fw * scale, boxH = fh * scale;
  const bx = (outW - boxW) / 2, by = (outH - boxH) / 2;
  const sw = contentW * scale, sh = contentH * scale;
  // pdf-lib rotates counter-clockwise about the anchor (bottom-left of the unrotated content).
  const ccw = (360 - rot) % 360;
  let x = bx, y = by;
  if (ccw === 90) x = bx + sh;               // content occupies [-h, 0] x [0, w]
  else if (ccw === 180) { x = bx + sw; y = by + sh; } // [-w, 0] x [-h, 0]
  else if (ccw === 270) y = by + sw;         // [0, h] x [-w, 0]
  return { scale, box: { x: bx, y: by, width: boxW, height: boxH }, x, y, width: sw, height: sh, rotateCCW: ccw };
}

/** Footprint of an anchored, rotated content rect: used by tests to prove fitPlacement. */
export function footprint(x, y, w, h, ccw) {
  const rad = (ccw * Math.PI) / 180, c = Math.round(Math.cos(rad)), s = Math.round(Math.sin(rad));
  const pts = [[0, 0], [w, 0], [0, h], [w, h]].map(([px, py]) => [x + px * c - py * s, y + px * s + py * c]);
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
}

/** Pointer drag on the crop box. `mode` is 'move' or a handle: n, s, e, w, ne, nw, se, sw. */
export function dragRect(start, mode, dx, dy) {
  if (mode === 'move') {
    return { ...start, x: clamp(start.x + dx, 0, 1 - start.w), y: clamp(start.y + dy, 0, 1 - start.h) };
  }
  let x0 = start.x, y0 = start.y, x1 = start.x + start.w, y1 = start.y + start.h;
  if (mode.includes('w')) x0 = clamp(x0 + dx, 0, x1 - MIN_CROP);
  if (mode.includes('e')) x1 = clamp(x1 + dx, x0 + MIN_CROP, 1);
  if (mode.includes('n')) y0 = clamp(y0 + dy, 0, y1 - MIN_CROP);
  if (mode.includes('s')) y1 = clamp(y1 + dy, y0 + MIN_CROP, 1);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
