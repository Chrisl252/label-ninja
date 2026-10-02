// The batch: source pages the user added and the label crops planned from them. One page can
// yield several crops (2-up / 4-up sheets, a packing slip). Changing the layout, preset or
// slip setting re-plans every page from a fresh low-res render, so no pixels are kept around.

import { detectLabel } from './detect.js';
import { planPage } from './layouts.js';
import { presetRect } from './geometry.js';

const DETECT_WIDTH = 640;
const THUMB_WIDTH = 180;

function thumbnail(canvas) {
  const t = document.createElement('canvas');
  t.width = THUMB_WIDTH;
  t.height = Math.round((canvas.height / canvas.width) * THUMB_WIDTH);
  t.getContext('2d').drawImage(canvas, 0, 0, t.width, t.height);
  return t;
}

/** A fresh copy of a page thumbnail: a canvas element can only sit in one tile. */
export function cloneThumb(page) {
  const c = document.createElement('canvas');
  c.width = page.thumb.width; c.height = page.thumb.height;
  c.getContext('2d').drawImage(page.thumb, 0, 0);
  return c;
}

function partTitle(page, part, count) {
  if (part.role === 'slip') return `${page.title} · packing slip`;
  return count > 1 && part.slots > 1 ? `${page.title} · label ${part.slot}` : page.title;
}

export function createBatch(getSources) {
  let pages = [];
  let items = [];
  let pageSeq = 1, itemSeq = 1;

  async function pixelsFor(page) {
    const { renderPage } = await getSources();
    const canvas = await renderPage(page.source, page.pageIndex, DETECT_WIDTH);
    if (!page.thumb) page.thumb = thumbnail(canvas);
    const px = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
    canvas.width = 0;
    return px;
  }

  function itemsFor(page, pixels, opts) {
    const parts = planPage({ pixels, layout: opts.layout, preset: opts.preset, slip: opts.slip, detect: detectLabel, fixedRect: presetRect(opts.preset) });
    const labels = parts.filter((p) => p.role === 'label').length;
    return parts.map((part) => ({
      key: itemSeq++, page, source: page.source, pageIndex: page.pageIndex, role: part.role, slot: part.slot,
      title: partTitle(page, part, labels), rect: part.rect, auto: part.auto, note: part.note, rotation: null,
    }));
  }

  return {
    get items() { return items; },
    get pageCount() { return pages.length; },
    get fileCount() { return new Set(pages.map((p) => p.source.id)).size; },

    /** Add every page of a loaded source. onPage(done, total) reports progress. */
    async addSource(source, opts, onPage = () => {}) {
      const added = [];
      for (const info of source.pages) {
        onPage(info.index, source.pages.length);
        const title = source.pages.length > 1 ? `${source.name} · p${info.index + 1}` : source.name;
        const page = { key: pageSeq++, source, pageIndex: info.index, title, thumb: null };
        const fresh = itemsFor(page, await pixelsFor(page), opts);
        pages.push(page);
        items.push(...fresh);
        added.push(...fresh);
      }
      onPage(source.pages.length, source.pages.length);
      return added;
    },

    /** Re-plan every page with new settings. Manual crops and turns are reset. */
    async replan(opts, onPage = () => {}) {
      const next = [];
      for (let i = 0; i < pages.length; i++) {
        onPage(i, pages.length);
        next.push(...itemsFor(pages[i], await pixelsFor(pages[i]), opts));
      }
      onPage(pages.length, pages.length);
      items = next;
      return items;
    },

    /** Drop one crop. Returns sources that no longer have any crop (to release). */
    removeItem(key) {
      const item = items.find((i) => i.key === key);
      if (!item) return [];
      items = items.filter((i) => i !== item);
      if (!items.some((i) => i.page === item.page)) pages = pages.filter((p) => p !== item.page);
      return pages.some((p) => p.source === item.source) ? [] : [item.source];
    },

    clear() {
      const sources = [...new Set(pages.map((p) => p.source))];
      pages = []; items = [];
      return sources;
    },
  };
}
