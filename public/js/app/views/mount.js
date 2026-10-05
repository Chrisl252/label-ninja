// Mounts the app-only views once, before any module queries their ids.
// index.html keeps the crawlable content (home, tools, guides, footer); the
// signed-in views, the editor workbench and the overlays render from here.

import { EDITOR_VIEW } from './editor-view.js?v=packing-20261005c';
import { DASHBOARD_VIEW, ACCOUNT_VIEW } from './account-views.js?v=packing-20261005c';
import { OVERLAYS_VIEW } from './overlays.js?v=packing-20261005c';

let mounted = false;

export function mountViews() {
  if (mounted) return;
  mounted = true;
  const home = document.getElementById('mode-home');
  home.insertAdjacentHTML('afterend', DASHBOARD_VIEW + EDITOR_VIEW);
  document.getElementById('mode-guides').insertAdjacentHTML('afterend', ACCOUNT_VIEW);
  document.body.insertAdjacentHTML('beforeend', OVERLAYS_VIEW);
}
