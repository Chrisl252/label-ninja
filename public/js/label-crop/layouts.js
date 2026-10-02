// Sheet layouts for the 4x6 converter: pages that carry 2 or 4 labels, and the packing slip
// that often shares a page with the label. Pure: no DOM, no libraries; unit-tested in Node.
// Rects are normalized to the displayed page ({x, y, w, h} in 0..1, origin top-left).

export const FULL_PAGE = Object.freeze({ x: 0, y: 0, w: 1, h: 1 });

export const LAYOUTS = {
  single: { id: 'single', label: '1 label per page', cells: [{ x: 0, y: 0, w: 1, h: 1 }] },
  'two-stack': { id: 'two-stack', label: '2 labels, one above the other', cells: [{ x: 0, y: 0, w: 1, h: 0.5 }, { x: 0, y: 0.5, w: 1, h: 0.5 }] },
  'two-side': { id: 'two-side', label: '2 labels, side by side', cells: [{ x: 0, y: 0, w: 0.5, h: 1 }, { x: 0.5, y: 0, w: 0.5, h: 1 }] },
  four: {
    id: 'four', label: '4 labels (2 × 2 grid)',
    cells: [{ x: 0, y: 0, w: 0.5, h: 0.5 }, { x: 0.5, y: 0, w: 0.5, h: 0.5 }, { x: 0, y: 0.5, w: 0.5, h: 0.5 }, { x: 0.5, y: 0.5, w: 0.5, h: 0.5 }],
  },
};

export const SLIP_MODES = { drop: 'Leave the packing slip out', page: 'Add the packing slip as its own 4 × 6 page' };

/** Copies of the cells for a layout id (unknown ids fall back to one label per page). */
export function layoutCells(id) {
  return (LAYOUTS[id] || LAYOUTS.single).cells.map((c) => ({ ...c }));
}

/** Map a rect expressed inside `cell` (0..1 of the cell) back to page coordinates. */
export function cellToPage(cell, r) {
  return { x: cell.x + r.x * cell.w, y: cell.y + r.y * cell.h, w: r.w * cell.w, h: r.h * cell.h };
}

/** Cut RGBA image data ({data, width, height}) down to a normalized cell. */
export function cropPixels(img, cell) {
  const x0 = Math.max(0, Math.round(cell.x * img.width));
  const y0 = Math.max(0, Math.round(cell.y * img.height));
  const x1 = Math.min(img.width, Math.round((cell.x + cell.w) * img.width));
  const y1 = Math.min(img.height, Math.round((cell.y + cell.h) * img.height));
  const w = Math.max(1, x1 - x0), h = Math.max(1, y1 - y0);
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h && y0 + y < img.height; y++) {
    const from = ((y0 + y) * img.width + x0) * 4;
    data.set(img.data.subarray(from, from + Math.min(w, img.width - x0) * 4), y * w * 4);
  }
  return { data, width: w, height: h };
}

/**
 * Where the packing slip sits: the largest strip of the page outside the label rect (below,
 * above, right or left of it). Returns null when that strip is too small to hold a slip.
 */
export function slipRegion(label, minArea = 0.08) {
  const right = label.x + label.w, bottom = label.y + label.h;
  const strips = [
    { x: 0, y: bottom, w: 1, h: 1 - bottom },
    { x: 0, y: 0, w: 1, h: label.y },
    { x: right, y: 0, w: 1 - right, h: 1 },
    { x: 0, y: 0, w: label.x, h: 1 },
  ];
  let best = null;
  for (const s of strips) if (s.w > 0 && s.h > 0 && (!best || s.w * s.h > best.w * best.h)) best = s;
  return best && best.w * best.h >= minArea ? best : null;
}

function labelNote(found) {
  if (!found) return 'blank, full area used';
  return found.method === 'frame' ? 'label border found' : 'content found';
}

/**
 * Plan the crops for one rendered page. Returns parts in output order:
 *   [{ role: 'label' | 'slip', rect, auto, note, slot, slots }]
 * `detect(pixels)` is detectLabel; `fixedRect` is the preset rect when preset !== 'auto'.
 * Multi-label layouts detect inside each slot and skip blank slots in auto mode, so a 2-up
 * sheet with only one label printed yields one page.
 */
export function planPage({ pixels, layout = 'single', preset = 'auto', slip = 'drop', detect, fixedRect = null }) {
  const auto = preset === 'auto' || !fixedRect;
  if (!LAYOUTS[layout] || layout === 'single') {
    const found = detect(pixels);
    const detected = found ? found.rect : { ...FULL_PAGE };
    const rect = auto ? detected : { ...fixedRect };
    const parts = [{ role: 'label', rect, auto: detected, note: auto ? labelNote(found) : 'preset crop', slot: 1, slots: 1 }];
    if (slip === 'page') {
      const region = slipRegion(rect);
      const inSlip = region ? detect(cropPixels(pixels, region)) : null;
      if (inSlip) {
        const slipRect = cellToPage(region, inSlip.rect);
        parts.push({ role: 'slip', rect: slipRect, auto: { ...slipRect }, note: 'packing slip', slot: 1, slots: 1 });
      }
    }
    return parts;
  }
  const cells = layoutCells(layout);
  const parts = [];
  cells.forEach((cell, i) => {
    const found = detect(cropPixels(pixels, cell));
    if (auto && !found) return; // empty slot on a partly used sheet
    const detected = found ? cellToPage(cell, found.rect) : { ...cell };
    parts.push({ role: 'label', rect: auto ? detected : { ...cell }, auto: detected, note: `label ${i + 1} of ${cells.length}`, slot: i + 1, slots: cells.length });
  });
  if (!parts.length) parts.push({ role: 'label', rect: { ...FULL_PAGE }, auto: { ...FULL_PAGE }, note: 'blank page, full page used', slot: 1, slots: 1 });
  return parts;
}
