// Presentation helpers for the Packing Bench editor. Printing stays in editor.js
// and the existing specification/export modules. No label contents are stored here.
import { getElements, selectedId, selectElement, renderCanvas, changeCanvasSize } from './editor.js';
import { markDirty, onToolDirty } from './exporter.js';

const STOCK_KEY = 'ln.editor.stock.v1';
const DIRECTIONS = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
let initialized = false;

function readStock() {
  try { return localStorage.getItem(STOCK_KEY) || ''; } catch { return ''; }
}

function rememberStock(value) {
  try { localStorage.setItem(STOCK_KEY, value); } catch { /* blocked storage leaves the tool usable */ }
}

export function initPackingTools() {
  if (initialized) return;
  initialized = true;
  const canvas = document.getElementById('label-canvas');
  const picker = document.getElementById('editor-element-picker');
  const status = document.getElementById('editor-position-status');
  const preset = document.getElementById('preset-size');
  const stockButton = document.getElementById('editor-last-stock');
  if (!canvas || !picker || !preset) return;

  function updateStockButton() {
    const saved = readStock();
    const option = [...preset.options].find((item) => item.value === saved);
    stockButton.hidden = !option;
    if (option) stockButton.textContent = `Use last stock: ${option.textContent.split(' (')[0]}`;
  }

  function syncSelection() {
    const elements = getElements();
    const options = [new Option('Choose an element', '')];
    elements.forEach((element, index) => {
      const text = String(element.text || '');
      options.push(new Option(`${index + 1}. ${element.type}: ${text.slice(0, 48)}`, element.id));
      const node = canvas.children[index];
      if (!node) return;
      node.tabIndex = 0;
      node.dataset.editorElement = element.id;
      node.setAttribute('role', 'button');
      node.setAttribute('aria-pressed', String(element.id === selectedId));
      node.setAttribute('aria-label', `${element.type}: ${text.slice(0, 80)}. Enter to select; arrow keys to move; Shift for ten pixels.`);
    });
    picker.replaceChildren(...options);
    picker.value = selectedId || '';
    const selected = elements.find((element) => element.id === selectedId);
    document.querySelectorAll('[data-editor-nudge]').forEach((button) => { button.disabled = !selected; });
    status.textContent = selected ? `Position: ${Math.round(selected.x)}, ${Math.round(selected.y)} px` : 'Select an element to move it.';
  }

  function moveElement(id, dx, dy, restoreFocus = false) {
    const index = getElements().findIndex((element) => element.id === id);
    const element = getElements()[index];
    const node = canvas.children[index];
    if (!element || !node) return;
    const maxX = Math.max(0, canvas.clientWidth - node.offsetWidth);
    const maxY = Math.max(0, canvas.clientHeight - node.offsetHeight);
    element.x = Math.min(maxX, Math.max(0, element.x + dx));
    element.y = Math.min(maxY, Math.max(0, element.y + dy));
    if (selectedId !== id) selectElement(id);
    else renderCanvas();
    markDirty('editor');
    syncSelection();
    if (restoreFocus) canvas.children[index]?.focus({ preventScroll: true });
  }

  canvas.addEventListener('keydown', (event) => {
    const target = event.target.closest('[data-editor-element]');
    if (!target || !canvas.contains(target)) return;
    const id = target.dataset.editorElement;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const index = getElements().findIndex((element) => element.id === id);
      selectElement(id);
      syncSelection();
      canvas.children[index]?.focus({ preventScroll: true });
      return;
    }
    const key = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }[event.key];
    if (!key || event.ctrlKey || event.metaKey || event.altKey) return;
    event.preventDefault();
    const [dx, dy] = DIRECTIONS[key];
    const step = event.shiftKey ? 10 : 1;
    moveElement(id, dx * step, dy * step, true);
  });
  picker.addEventListener('change', () => { if (picker.value) selectElement(picker.value); });
  document.querySelectorAll('[data-editor-nudge]').forEach((button) => button.addEventListener('click', (event) => {
    const [dx, dy] = DIRECTIONS[button.dataset.editorNudge];
    const step = event.shiftKey ? 10 : 1;
    moveElement(selectedId, dx * step, dy * step);
  }));
  preset.addEventListener('change', () => { rememberStock(preset.value); updateStockButton(); });
  stockButton.addEventListener('click', () => {
    const saved = readStock();
    if (![...preset.options].some((option) => option.value === saved)) return;
    preset.value = saved;
    changeCanvasSize();
  });
  // Restoring a stock always needs this explicit click. Opening a view never
  // replaces an existing draft, project, template, or physical preset.
  new MutationObserver(syncSelection).observe(canvas, { childList: true });
  onToolDirty((tool) => { if (tool === 'editor') syncSelection(); });
  updateStockButton();
  syncSelection();
}
