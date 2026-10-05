// The homepage links are the real navigation. Focus/hover only changes sample artwork.
// Remember the last clicked job, never label content or files; do not touch studio drafts.
const JOBS = Object.freeze({
  shipping: { title: 'Shipping label', asset: 'home-shipping.svg', width: 120, height: 180, size: '4 × 6 in', x: '4.00 in', y: '6.00 in', alt: 'Illustrative 4 by 6 inch shipping label; not valid postage' },
  bin: { title: 'Warehouse bin label', asset: 'home-bin.svg', width: 120, height: 180, size: '4 × 6 in', x: '4.00 in', y: '6.00 in', alt: 'Sample 4 by 6 inch bin label: BIN 1A and its CODE128 barcode' },
  whatnot: { title: 'Whatnot show number', asset: 'home-whatnot.svg', width: 150, height: 100, size: '3 × 2 in', x: '3.00 in', y: '2.00 in', alt: 'Sample 3 by 2 inch Whatnot number label; choose among three stock sizes in the tool' },
  fnsku: { title: 'Product / FNSKU label', asset: 'home-fnsku.svg', width: 200, height: 100, size: '2 × 1 in', x: '2.00 in', y: '1.00 in', alt: 'Example 2 by 1 inch product label with an illustrative FNSKU' },
});
const STORAGE_KEY = 'ln.home.job';

export function initHomePicker() {
  const root = document.getElementById('mode-home');
  const image = root?.querySelector('[data-home-preview-image]');
  if (!image) return;
  const links = [...root.querySelectorAll('[data-home-job]')];
  function show(key) {
    if (!Object.hasOwn(JOBS, key)) return;
    const job = JOBS[key];
    links.forEach((link) => link.classList.toggle('is-selected', link.dataset.homeJob === key));
    image.src = `/assets/${job.asset}`;
    image.alt = job.alt;
    image.width = job.width;
    image.height = job.height;
    root.querySelector('[data-home-preview-title]').textContent = job.title;
    root.querySelector('[data-home-preview-size]').textContent = job.size;
    root.querySelector('[data-home-preview-width]').textContent = job.x;
    root.querySelector('[data-home-preview-height]').textContent = job.y;
    root.querySelector('[data-home-preview-kind]').dataset.homePreviewKind = key;
  }
  for (const link of links) {
    link.addEventListener('focus', () => show(link.dataset.homeJob));
    link.addEventListener('pointerenter', () => show(link.dataset.homeJob));
    link.addEventListener('click', () => {
      try { localStorage.setItem(STORAGE_KEY, link.dataset.homeJob); } catch { /* Storage is optional. */ }
    });
  }
  try { show(localStorage.getItem(STORAGE_KEY)); } catch { /* The default sample remains usable. */ }
}
