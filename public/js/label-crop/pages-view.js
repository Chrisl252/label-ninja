// Thumbnail list: one tile per label page with its crop drawn on top. Selecting a tile opens
// it in the crop editor; the remove button drops that page from the batch.

export function createPagesView(list, { onSelect, onRemove }) {
  const tiles = new Map(); // item.key -> {li, cropEl, rotEl}

  function rotationText(item) {
    return item.rotation == null ? '' : ` · turned ${item.rotation}°`;
  }

  function add(item, thumbCanvas) {
    const li = document.createElement('li');
    li.className = 'lc-tile';
    const pick = document.createElement('button');
    pick.type = 'button';
    pick.className = 'lc-tile__pick';
    const frame = document.createElement('span');
    frame.className = 'lc-tile__frame';
    thumbCanvas.className = 'lc-tile__thumb';
    thumbCanvas.setAttribute('aria-hidden', 'true');
    const cropEl = document.createElement('span');
    cropEl.className = 'lc-tile__crop';
    frame.append(thumbCanvas, cropEl);
    const cap = document.createElement('span');
    cap.className = 'lc-tile__cap';
    pick.append(frame, cap);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'lc-tile__remove';
    remove.textContent = 'Remove';
    remove.setAttribute('aria-label', `Remove ${item.title}`);
    pick.addEventListener('click', () => onSelect(item.key));
    remove.addEventListener('click', () => onRemove(item.key));
    li.append(pick, remove);
    list.append(li);
    tiles.set(item.key, { li, pick, cropEl, cap });
    update(item);
  }

  function update(item) {
    const t = tiles.get(item.key);
    if (!t) return;
    const r = item.rect || { x: 0, y: 0, w: 1, h: 1 };
    Object.assign(t.cropEl.style, { left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.w * 100}%`, height: `${r.h * 100}%` });
    t.cap.textContent = `${item.title}${item.note ? ` · ${item.note}` : ''}${rotationText(item)}`;
  }

  function select(key) {
    for (const [k, t] of tiles) t.pick.setAttribute('aria-pressed', String(k === key));
  }

  function remove(key) {
    const t = tiles.get(key);
    if (t) { t.li.remove(); tiles.delete(key); }
  }

  function clear() { list.replaceChildren(); tiles.clear(); }

  return { add, update, select, remove, clear };
}
