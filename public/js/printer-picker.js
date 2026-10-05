// Progressive enhancement of crawlable, sourced printer cards. No shopping URLs are generated.
// Unknown fanfold support never passes the confirmed-support filter.
export function matchesPrinter(card, filters) {
  const uses = String(card.use || '').split(/\s+/);
  const connections = String(card.connection || '').split(/\s+/);
  return (filters.use === 'all' || uses.includes(filters.use))
    && (filters.connection === 'all' || connections.includes(filters.connection) || connections.includes(`${filters.connection}-optional`))
    && (!filters.fanfold || card.fanfold === 'yes');
}

export function initPrinterPicker() {
  const root = document.getElementById('best-label-printers');
  if (!root) return;
  const cards = [...root.querySelectorAll('[data-printer-id]')];
  const use = root.querySelector('[data-printer-use]:not([data-printer-id])');
  const connection = root.querySelector('[data-printer-connection]:not([data-printer-id])');
  const fanfold = root.querySelector('input[data-printer-fanfold]');
  const results = root.querySelector('[data-printer-results]');
  const tray = root.querySelector('[data-printer-compare-bar]');
  const open = root.querySelector('[data-printer-open-compare]');
  const dialog = root.querySelector('[data-printer-comparison]');
  const selected = new Set();
  root.querySelector('[data-printer-filters]').hidden = false;
  root.querySelectorAll('.printer-compare-choice').forEach((choice) => { choice.hidden = false; });

  function filter() {
    const filters = { use: use.value, connection: connection.value, fanfold: fanfold.checked };
    let visible = 0;
    for (const card of cards) {
      const match = matchesPrinter({ use: card.dataset.printerUse, connection: card.dataset.printerConnection, fanfold: card.dataset.printerFanfold }, filters);
      card.hidden = !match;
      if (match) visible += 1;
    }
    results.textContent = `${visible} of ${cards.length} printer choices. Optional connections still need the exact variant checked.`;
    root.querySelector('[data-printer-empty]').hidden = visible !== 0;
  }

  function updateSelection() {
    const names = [];
    for (const card of cards) {
      const input = card.querySelector('[data-printer-select]');
      const picked = selected.has(card.dataset.printerId);
      input.checked = picked;
      input.disabled = !picked && selected.size === 2;
      card.classList.toggle('is-selected', picked);
      if (picked) names.push(card.querySelector('h3').textContent.trim());
    }
    tray.hidden = selected.size === 0;
    open.disabled = selected.size !== 2;
    root.querySelector('[data-printer-selected-summary]').textContent = selected.size === 1 ? `${names[0]} selected. Choose one more.` : names.join(' + ');
  }

  use.addEventListener('change', filter);
  connection.addEventListener('change', filter);
  fanfold.addEventListener('change', filter);
  root.querySelector('[data-printer-reset]').addEventListener('click', () => {
    use.value = 'all'; connection.value = 'all'; fanfold.checked = false; filter();
  });
  for (const card of cards) {
    card.querySelector('[data-printer-select]').addEventListener('change', (event) => {
      const id = card.dataset.printerId;
      if (event.target.checked && selected.size < 2) selected.add(id);
      else selected.delete(id);
      updateSelection();
    });
  }
  root.querySelector('[data-printer-clear-compare]').addEventListener('click', () => { selected.clear(); updateSelection(); });
  open.addEventListener('click', () => {
    if (selected.size !== 2) return;
    const items = root.querySelector('[data-printer-comparison-items]');
    items.replaceChildren();
    for (const card of cards.filter((item) => selected.has(item.dataset.printerId))) {
      const item = document.createElement('article');
      item.className = 'printer-comparison__item';
      const title = document.createElement('h4');
      title.textContent = card.querySelector('h3').textContent;
      item.append(title);
      for (const selector of ['.printer-facts', '.printer-verdict', '.printer-skip', '.printer-source']) {
        item.append(card.querySelector(selector).cloneNode(true));
      }
      items.append(item);
    }
    dialog.showModal();
  });
  root.querySelector('[data-printer-close-compare]').addEventListener('click', () => dialog.close());
  filter();
  updateSelection();
}
