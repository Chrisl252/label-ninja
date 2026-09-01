// Hash routing helper — pure, DOM-free, node-testable.
// Guides content lives in index.html; this maps a URL hash to the app mode
// that owns it (SEO landing hashes -> guides / tool pages).

const GUIDE_HASH_HINTS = [
  'best-label-printers',
  'printer-setup',
  'seo-keywords',
  'rollo-setup',
  'zebra-setup',
  'dymo-setup',
  'pricing',
];

export function modeFromHash(hash) {
  const h = String(hash || '');
  for (const hint of GUIDE_HASH_HINTS) {
    if (h.includes(hint)) return 'guides';
  }
  if (h.includes('warehouse-rack-bin-label-generator')) return 'bin';
  if (h.includes('whatnot-live-show-number-generator')) return 'whatnot';
  if (h.includes('amazon-fba-fnsku-generator')) return 'fnsku';
  return 'editor';
}

// Every #section id a guide hash may target for scroll-into-view.
export const GUIDE_SECTION_IDS = [
  'pricing',
  'printer-setup-checklist',
  'best-label-printers',
  'seo-keywords',
  'rollo-setup',
  'zebra-setup',
  'dymo-setup',
];

export function sectionIdFromHash(hash) {
  const h = String(hash || '').replace(/^#/, '');
  if (!h) return null;
  const tail = h.includes('/') ? h.split('/').pop() : h;
  return GUIDE_SECTION_IDS.includes(tail) ? tail : null;
}
