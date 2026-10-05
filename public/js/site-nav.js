// Shared navigation: real links first, optional search and saved theme second.
(function () {
  var root = document.documentElement;
  var theme = 'light';
  try { theme = localStorage.getItem('ln.theme') === 'dark' ? 'dark' : 'light'; } catch (_) {}
  root.dataset.theme = theme;
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
  function enhance() {
    mark();
    var header = document.querySelector('.site-header');
    if (!header) return;
    var tools = header.querySelector('.site-controls') || document.createElement('div');
    tools.className = 'site-controls';
    var themeButton = tools.querySelector('[data-site-theme]') || document.createElement('button');
    themeButton.disabled = false;
    themeButton.type = 'button';
    themeButton.className = 'site-control';
    function paintTheme() {
      var dark = root.dataset.theme === 'dark';
      themeButton.textContent = dark ? 'Light' : 'Dark';
      themeButton.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.content = getComputedStyle(root).getPropertyValue('--color-chassis').trim();
    }
    paintTheme();
    themeButton.addEventListener('click', function () {
      root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('ln.theme', root.dataset.theme); } catch (_) {}
      paintTheme();
    });
    tools.appendChild(themeButton);
    header.insertBefore(tools, header.querySelector('.masthead__actions'));

    var menu = header.querySelector('.nav-group');
    if (menu) {
      menu.addEventListener('click', function (event) { if (event.target.closest('a')) menu.open = false; });
      document.addEventListener('click', function (event) { if (!menu.contains(event.target)) menu.open = false; });
      menu.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') { menu.open = false; menu.querySelector('summary').focus(); }
      });
    }
    if (window.ResizeObserver) new ResizeObserver(function () {
      root.style.setProperty('--masthead-h', header.getBoundingClientRect().height + 'px');
    }).observe(header);

    var catalog = [
      ['Shipping label to 4x6', '/shipping-label-to-4x6', 'Convert PDF image screenshot crop'],
      ['Warehouse bin labels', '/#tools/warehouse-rack-bin-label-generator', 'rack shelf barcode batch'],
      ['Whatnot show numbers', '/whatnot-labels', 'auction lots numbered labels'],
      ['FNSKU labels', '/#tools/amazon-fba-fnsku-generator', 'Amazon existing product identifier'],
      ['Custom label editor', '/#editor', 'text barcode images size templates'],
      ['Label sizes', '/#label-sizes', 'stock measurements dimensions'],
      ['Compare label printers', '/#best-label-printers', 'Rollo Zebra DYMO Brother MUNBYN USB WiFi'],
      ['Label stock and holders', '/#label-supplies', 'roll fanfold supplies'],
      ['Printer setup checklist', '/#printer-setup-checklist', 'calibrate actual size scaling margins'],
      ['Printing guides', '/guides/', 'troubleshoot help'],
      ['Full-page label to 4x6', '/guides/8-5x11-shipping-label-to-4x6', 'letter PDF convert'],
      ['eBay label is not 4x6', '/guides/ebay-shipping-label-not-4x6', 'small wrong size'],
      ['Amazon return label to 4x6', '/guides/print-amazon-return-label-4x6', 'QR return'],
      ['Whatnot labels print too small', '/guides/whatnot-labels-printing-too-small', 'scale calibration'],
      ['Privacy and file handling', '/privacy', 'upload local browser server data'],
      ['Terms', '/terms', 'service owner']
    ];
    var dialog = document.createElement('dialog');
    if (!dialog.showModal) return;
    dialog.className = 'site-search';
    dialog.setAttribute('aria-labelledby', 'site-search-title');
    var head = document.createElement('div'); head.className = 'site-search__head';
    var title = document.createElement('h2'); title.id = 'site-search-title'; title.textContent = 'Find a tool or fix';
    var close = document.createElement('button'); close.type = 'button'; close.className = 'site-control'; close.textContent = 'Close';
    head.append(title, close);
    var label = document.createElement('label'); label.className = 'sr-only'; label.htmlFor = 'site-search-input'; label.textContent = 'Search tools, printers and guides';
    var input = document.createElement('input'); input.id = 'site-search-input'; input.type = 'search'; input.className = 'input'; input.placeholder = 'Try “4x6”, “barcode” or “too small”';
    var results = document.createElement('ul'); results.className = 'site-search__results';
    var status = document.createElement('p'); status.className = 'small muted'; status.setAttribute('role', 'status');
    dialog.append(head, label, input, results, status); document.body.appendChild(dialog);
    function filter() {
      var query = input.value.toLowerCase().trim();
      results.replaceChildren();
      var matches = catalog.filter(function (row) { return (row[0] + ' ' + row[2]).toLowerCase().includes(query); });
      matches.forEach(function (row) {
        var li = document.createElement('li'); var link = document.createElement('a');
        link.href = row[1]; link.textContent = row[0]; li.appendChild(link); results.appendChild(li);
      });
      status.textContent = matches.length ? matches.length + ' destinations. Use Tab to choose a result.' : 'No matches. Try a label size or printing problem.';
    }
    var opener;
    function openSearch() { opener = document.activeElement; input.value = ''; filter(); if (!dialog.open) dialog.showModal(); input.focus(); }
    function closeSearch() { dialog.close(); }
    dialog.addEventListener('close', function () { if (opener && document.contains(opener)) opener.focus(); });
    close.addEventListener('click', closeSearch);
    dialog.addEventListener('click', function (event) { if (event.target === dialog || event.target.closest('a')) closeSearch(); });
    input.addEventListener('input', filter);
    input.addEventListener('keydown', function (event) { if (event.key === 'Enter' && results.querySelector('a')) results.querySelector('a').click(); });
    var find = tools.querySelector('[data-site-search]') || document.createElement('button'); find.disabled = false; find.type = 'button'; find.className = 'site-control'; find.textContent = 'Find'; find.setAttribute('aria-label', 'Find a tool or guide'); find.setAttribute('aria-keyshortcuts', 'Control+k Meta+k'); find.addEventListener('click', openSearch); tools.prepend(find);
    document.addEventListener('keydown', function (event) { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); openSearch(); } });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', enhance);
  else enhance();
  window.addEventListener('hashchange', mark);
})();
