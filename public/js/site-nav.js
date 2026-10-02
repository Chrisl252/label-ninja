// Marks the current .site-nav link with aria-current="page". Optional: include with
// <script src="/js/site-nav.js" defer></script>. Hash links (/#tools/...) match only on "/" with that hash.
(function () {
  function norm(path) {
    var p = (path || '/').replace(/\.html$/, '').replace(/\/index$/, '/');
    return p.length > 1 ? p.replace(/\/+$/, '') : '/';
  }
  function mark() {
    var nav = document.querySelector('.site-nav');
    if (!nav) return;
    var here = norm(location.pathname);
    var links = nav.querySelectorAll('a[href]');
    var best = null;
    var bestLen = -1;
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      a.removeAttribute('aria-current');
      var u = new URL(a.getAttribute('href'), location.href);
      if (u.origin !== location.origin) continue;
      var target = norm(u.pathname);
      var match = u.hash
        ? (target === here && u.hash === location.hash)
        : (target === here || (target !== '/' && here.indexOf(target + '/') === 0));
      if (match && target.length + u.hash.length > bestLen) { best = a; bestLen = target.length + u.hash.length; }
    }
    if (best) best.setAttribute('aria-current', 'page');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mark);
  else mark();
  window.addEventListener('hashchange', mark);
})();
