// Remembers the last label tool so the home page can offer "continue where you
// left off". Mode switches only hide sections, so in-memory drafts and export
// retry keys survive a trip to the home page or guides.
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

// null until a label tool has been opened in this tab.
export function lastWorkspaceLink() {
  return lastWorkspace ? { ...WORKSPACES[lastWorkspace] } : null;
}
