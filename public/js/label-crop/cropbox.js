// Draggable crop box over the selected page preview. Pointer drag moves or resizes; arrow keys
// move it 1% (Shift+arrows resize). Reports normalized rects through onChange.

import { dragRect, clampRect } from './geometry.js';

const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

export function createCropEditor(stage, { onChange }) {
  const frame = document.createElement('div');
  frame.className = 'lc-stage__frame';
  const box = document.createElement('div');
  box.className = 'lc-crop';
  box.tabIndex = 0;
  box.setAttribute('role', 'group');
  box.setAttribute('aria-label', 'Crop box. Drag to move, drag a corner to resize. Arrow keys move it; Shift and arrow keys resize it.');
  for (const h of HANDLES) {
    const el = document.createElement('span');
    el.className = `lc-crop__handle lc-crop__handle--${h}`;
    el.dataset.handle = h;
    box.append(el);
  }
  stage.replaceChildren(frame);

  let rect = null;
  let drag = null;

  function paint() {
    if (!rect) { box.hidden = true; return; }
    box.hidden = false;
    box.style.left = `${rect.x * 100}%`;
    box.style.top = `${rect.y * 100}%`;
    box.style.width = `${rect.w * 100}%`;
    box.style.height = `${rect.h * 100}%`;
  }

  function commit(next) {
    rect = clampRect(next);
    paint();
    onChange(rect);
  }

  box.addEventListener('pointerdown', (e) => {
    if (!rect || e.button > 0) return;
    e.preventDefault();
    const bounds = frame.getBoundingClientRect();
    drag = { mode: e.target.dataset.handle || 'move', sx: e.clientX, sy: e.clientY, start: rect, bounds };
    box.setPointerCapture(e.pointerId);
  });
  box.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = (e.clientX - drag.sx) / drag.bounds.width;
    const dy = (e.clientY - drag.sy) / drag.bounds.height;
    rect = dragRect(drag.start, drag.mode, dx, dy);
    paint();
  });
  const end = () => { if (drag) { drag = null; commit(rect); } };
  box.addEventListener('pointerup', end);
  box.addEventListener('pointercancel', end);

  box.addEventListener('keydown', (e) => {
    const step = 0.01;
    const keys = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (!rect || !keys[e.key]) return;
    e.preventDefault();
    const [dx, dy] = keys[e.key];
    commit(e.shiftKey ? dragRect(rect, 'se', dx, dy) : dragRect(rect, 'move', dx, dy));
  });

  return {
    /** Show a rendered page canvas with the given crop rect. */
    show(canvas, nextRect) {
      canvas.className = 'lc-stage__page';
      frame.replaceChildren(canvas, box);
      rect = nextRect ? clampRect(nextRect) : { x: 0, y: 0, w: 1, h: 1 };
      paint();
    },
    clear(message) {
      const p = document.createElement('p');
      p.className = 'lc-stage__empty';
      p.textContent = message;
      frame.replaceChildren(p);
      rect = null;
    },
    get rect() { return rect; },
  };
}
