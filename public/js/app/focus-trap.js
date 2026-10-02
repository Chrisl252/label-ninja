// Dialog focus handling shared by the account modal, save form and exports
// drawer: remember the opener, keep Tab inside the open dialog, and hand focus
// back on close.

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const openers = new WeakMap();

export function rememberOpener(dialog) {
  const active = document.activeElement;
  if (active && active !== document.body && !dialog.contains(active)) openers.set(dialog, active);
}

export function restoreOpener(dialog) {
  const opener = openers.get(dialog);
  openers.delete(dialog);
  if (opener && document.contains(opener) && typeof opener.focus === 'function') opener.focus();
}

function visibleFocusables(dialog) {
  return [...dialog.querySelectorAll(FOCUSABLE)].filter((node) => node.offsetParent !== null);
}

// Wire once per dialog: Tab / Shift+Tab wrap while the dialog is visible.
export function trapFocus(dialog) {
  dialog.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab' || dialog.classList.contains('hidden')) return;
    const nodes = visibleFocusables(dialog);
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
}
