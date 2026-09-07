// In-tab navigation keeps unsaved label contents and export retry keys in memory.
const WORKSPACES = Object.freeze({
  editor: { hash: '#editor', label: 'Back to your label' },
  bin: { hash: '#tools/warehouse-rack-bin-label-generator', label: 'Back to bin labels' },
  whatnot: { hash: '#tools/whatnot-live-show-number-generator', label: 'Back to Whatnot labels' },
  fnsku: { hash: '#tools/amazon-fba-fnsku-generator', label: 'Back to your FNSKU label' },
});
let lastWorkspace = null;

export function rememberWorkspace(mode) {
  if (Object.hasOwn(WORKSPACES, mode)) lastWorkspace = mode;
}

export function pricingReturn() {
  return lastWorkspace ? { ...WORKSPACES[lastWorkspace] } : { hash: '#editor', label: 'Start creating labels' };
}

export function openPricingInPlace() {
  navigateInPlace('#pricing');
}

export function navigateInPlace(hash) {
  if (hash !== '#pricing' && !Object.values(WORKSPACES).some(workspace => workspace.hash === hash)) return;
  // The hash may already say pricing after a customer switched tools via a tab.
  if (window.location.hash === hash) window.dispatchEvent(new HashChangeEvent('hashchange'));
  else window.location.hash = hash;
}
