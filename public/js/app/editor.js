// Editor — element state machine for the visual label canvas: add/select/
// update/delete elements, drag, templates, preset sizing, image uploads
// (WebP converted to PNG client-side before it ever reaches a spec), and the
// editor's metered export entry point.

import { PRESETS } from './presets.js';
import { buildEditorSpec } from './spec-builders.js';
import { runExport, markDirty } from './exporter.js';

const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export let elements = [];
export let selectedId = null;
let nextId = 1;

export function getElements() {
  return elements;
}

export function getCurrentPreset() {
  const presetKey = document.getElementById('preset-size').value;
  return PRESETS[presetKey] || PRESETS.standard;
}

function setImageUploadStatus(message, isError = false) {
  const status = document.getElementById('image-upload-status');
  status.textContent = message;
  status.className = `mt-2 min-h-5 text-xs ${isError ? 'text-red-400' : 'text-slate-400'}`;
}

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

// WebP is rejected by the server — convert to PNG through a canvas so both the
// preview and the export spec carry image/png data.
function pngDataUrlFromSrc(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        canvas.getContext('2d').drawImage(image, 0, 0);
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('WebP conversion failed.'));
            return;
          }
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error('WebP conversion failed.'));
          reader.readAsDataURL(blob);
        }, 'image/png');
      } catch (err) {
        reject(new Error('WebP conversion failed.'));
      }
    };
    image.onerror = () => reject(new Error('The image could not be decoded.'));
    image.src = src;
  });
}

function getImageDimensions(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error('The image could not be decoded.'));
    image.src = src;
  });
}

export async function handleImageUpload(fileList) {
  const files = Array.from(fileList || []).slice(0, 10);
  if (!files.length) return;

  let added = 0;
  const rejected = [];
  setImageUploadStatus(`Reading ${files.length} image${files.length === 1 ? '' : 's'}...`);

  for (const file of files) {
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      rejected.push(`${file.name}: use PNG, JPEG, or WebP`);
      continue;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      rejected.push(`${file.name}: larger than 8 MB`);
      continue;
    }

    try {
      let src = await readImageFile(file);
      if (file.type === 'image/webp') {
        setImageUploadStatus(`Converting ${file.name} to PNG...`);
        src = await pngDataUrlFromSrc(src);
      }
      const dimensions = await getImageDimensions(src);
      const canvas = document.getElementById('label-canvas');
      const maxWidth = Math.max(48, canvas.clientWidth * 0.65);
      const maxHeight = Math.max(32, canvas.clientHeight * 0.65);
      const scale = Math.min(1, maxWidth / dimensions.width, maxHeight / dimensions.height);
      const width = Math.max(24, Math.round(dimensions.width * scale));
      const height = Math.max(16, Math.round(dimensions.height * scale));

      addElement('image', {
        src,
        text: file.name,
        width,
        aspectRatio: dimensions.width / dimensions.height,
        x: Math.max(0, Math.round((canvas.clientWidth - width) / 2)),
        y: Math.max(0, Math.round((canvas.clientHeight - height) / 2)),
      });
      added += 1;
    } catch (error) {
      rejected.push(`${file.name}: ${error.message}`);
    }
  }

  const result = `${added} image${added === 1 ? '' : 's'} added to the label.`;
  setImageUploadStatus(rejected.length ? `${result} ${rejected.join(' · ')}` : result, rejected.length > 0 && added === 0);
}

export function changeCanvasSize() {
  const presetKey = document.getElementById('preset-size').value;
  const canvas = document.getElementById('label-canvas');
  const p = PRESETS[presetKey] || PRESETS.standard;
  canvas.style.width = p.width + 'px';
  canvas.style.height = p.height + 'px';
  document.getElementById('inspector-width').max = p.width;
  elements.forEach((element) => {
    if (element.type === 'image') element.width = Math.min(element.width, p.width);
  });
  markDirty('editor');
  renderCanvas();
}

export function addElement(type, customProps = {}) {
  const id = 'el-' + nextId++;
  const newEl = {
    id,
    type,
    x: 25,
    y: 20 + elements.length * 45,
    text: type === 'barcode' ? 'X001ABC123' : type === 'badge' ? '$19.99' : type === 'box' ? 'BORDER BOX' : 'SAMPLE TEXT',
    fontSize: type === 'barcode' ? 14 : type === 'badge' ? 16 : 24,
    width: 120,
    aspectRatio: 1,
    src: '',
    align: 'center',
    bold: true,
    ...customProps,
  };
  elements.push(newEl);
  markDirty('editor');
  selectElement(id);
  renderCanvas();
}

export function renderCanvas() {
  const canvas = document.getElementById('label-canvas');
  canvas.innerHTML = '';

  elements.forEach((el) => {
    const div = document.createElement('div');
    div.className = `canvas-element absolute cursor-move ${el.type === 'image' ? 'p-0' : 'p-1'} ${el.id === selectedId ? 'selected' : ''}`;
    div.style.left = el.x + 'px';
    div.style.top = el.y + 'px';
    div.style.textAlign = el.align;
    if (el.type !== 'image') {
      div.style.fontSize = el.fontSize + 'px';
      div.style.fontWeight = el.bold ? 'bold' : 'normal';
    }

    div.onclick = (e) => {
      e.stopPropagation();
      selectElement(el.id);
    };
    makeDraggable(div, el);

    if (el.type === 'text') {
      div.style.whiteSpace = 'pre-wrap';
      div.textContent = el.text;
    } else if (el.type === 'badge') {
      div.className += ' bg-black text-white px-3 py-1 font-mono font-bold rounded';
      div.innerText = el.text;
    } else if (el.type === 'box') {
      div.className += ' border-2 border-black p-2 font-bold';
      div.innerText = el.text;
    } else if (el.type === 'barcode') {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.id = `barcode-${el.id}`;
      div.appendChild(svg);
      setTimeout(() => {
        try {
          window.JsBarcode(`#barcode-${el.id}`, el.text, { format: 'CODE128', width: 2, height: 50, displayValue: true, fontSize: 13, fontOptions: 'bold', margin: 0 });
        } catch {
          // invalid barcode text — preview left empty; export surfaces the error
        }
      }, 0);
    } else if (el.type === 'image') {
      const image = document.createElement('img');
      image.src = el.src;
      image.alt = `Uploaded artwork: ${el.text}`;
      image.draggable = false;
      image.style.display = 'block';
      image.style.width = `${el.width}px`;
      image.style.height = 'auto';
      image.style.maxWidth = 'none';
      div.appendChild(image);
    }

    canvas.appendChild(div);
  });
}

function makeDraggable(domEl, elObj) {
  domEl.onpointerdown = (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    const initialX = elObj.x;
    const initialY = elObj.y;
    const canvas = document.getElementById('label-canvas');
    domEl.setPointerCapture(event.pointerId);

    domEl.onpointermove = (moveEvent) => {
      const maxX = Math.max(0, canvas.clientWidth - domEl.offsetWidth);
      const maxY = Math.max(0, canvas.clientHeight - domEl.offsetHeight);
      elObj.x = Math.min(maxX, Math.max(0, initialX + (moveEvent.clientX - startX)));
      elObj.y = Math.min(maxY, Math.max(0, initialY + (moveEvent.clientY - startY)));
      domEl.style.left = elObj.x + 'px';
      domEl.style.top = elObj.y + 'px';
    };

    const finishDrag = () => {
      domEl.onpointermove = null;
      domEl.onpointerup = null;
      domEl.onpointercancel = null;
      markDirty('editor');
    };
    domEl.onpointerup = finishDrag;
    domEl.onpointercancel = finishDrag;
  };
}

export function selectElement(id) {
  selectedId = id;
  const hit = elements.find((e) => e.id === id);
  if (hit) {
    const isImage = hit.type === 'image';
    const textInput = document.getElementById('inspector-text');
    textInput.value = hit.text;
    textInput.disabled = isImage;
    textInput.title = isImage ? 'Uploaded file name' : 'Edit selected element content';
    document.getElementById('text-size-controls').classList.toggle('hidden', isImage);
    document.getElementById('image-size-controls').classList.toggle('hidden', !isImage);
    document.getElementById('image-size-controls').classList.toggle('flex', isImage);
    document.getElementById('inspector-size').value = hit.fontSize;
    document.getElementById('size-val').innerText = hit.fontSize + 'px';
    document.getElementById('inspector-width').max = document.getElementById('label-canvas').clientWidth;
    document.getElementById('inspector-width').value = hit.width || 120;
    document.getElementById('width-val').innerText = (hit.width || 120) + 'px';
  }
  renderCanvas();
}

export function updateSelectedElement() {
  if (!selectedId) return;
  const hit = elements.find((e) => e.id === selectedId);
  if (hit) {
    if (hit.type === 'image') {
      hit.width = parseInt(document.getElementById('inspector-width').value);
      document.getElementById('width-val').innerText = hit.width + 'px';
    } else {
      hit.text = document.getElementById('inspector-text').value;
      hit.fontSize = parseInt(document.getElementById('inspector-size').value);
      document.getElementById('size-val').innerText = hit.fontSize + 'px';
    }
    markDirty('editor');
    renderCanvas();
  }
}

export function deleteSelectedElement() {
  if (!selectedId) return;
  elements = elements.filter((e) => e.id !== selectedId);
  selectedId = null;
  markDirty('editor');
  renderCanvas();
}

export function loadTemplate(type) {
  elements = [];
  if (type === 'shipping_4x6') {
    document.getElementById('preset-size').value = 'shipping';
    addElement('text', { text: 'DISCOUNT PANTRY LLC\n100 RESELLER WAY\nLAS VEGAS NV 89101', x: 20, y: 20, fontSize: 11 });
    addElement('text', { text: 'SHIP TO:\nCHRIS LUCAS\n123 MAIN STREET\nAPARTMENT 4B\nLAS VEGAS NV 89102', x: 40, y: 150, fontSize: 16 });
    addElement('barcode', { text: '4208910294001234567890', x: 30, y: 420 });
  } else if (type === 'fnsku') {
    document.getElementById('preset-size').value = 'fnsku';
    addElement('text', { text: 'Wireless Bluetooth Earbuds', x: 15, y: 10, fontSize: 12 });
    addElement('barcode', { text: 'X001ABC123', x: 35, y: 40 });
    addElement('text', { text: 'New', x: 135, y: 135, fontSize: 11 });
  } else if (type === 'suffocation') {
    document.getElementById('preset-size').value = 'polybag';
    addElement('text', { text: 'WARNING: TO AVOID DANGER OF SUFFOCATION, KEEP THIS BAG AWAY FROM BABIES AND CHILDREN.\n\nDO NOT USE IN CRIBS, BEDS, OR PLAYPENS. THIS BAG IS NOT A TOY.', x: 15, y: 40, fontSize: 12 });
  } else if (type === 'suffocation_large') {
    document.getElementById('preset-size').value = 'polybag_large';
    addElement('text', { text: 'WARNING: TO AVOID DANGER OF SUFFOCATION, KEEP THIS PLASTIC BAG AWAY FROM BABIES AND CHILDREN.\n\nDO NOT USE IN CRIBS, BEDS, CARRIAGES OR PLAYPENS. THIS BAG IS NOT A TOY.\n\nKNOT BAG BEFORE THROWING AWAY.', x: 20, y: 60, fontSize: 14 });
  } else if (type === 'sold_set') {
    document.getElementById('preset-size').value = 'standard';
    addElement('box', { text: 'SOLD AS SET - DO NOT SEPARATE\nTHIS IS A SINGLE ITEM', x: 25, y: 50, fontSize: 16 });
  } else if (type === 'fragile') {
    document.getElementById('preset-size').value = 'standard';
    addElement('box', { text: 'FRAGILE - HANDLE WITH CARE\nGLASSWARE / SENSITIVE CONTENTS', x: 20, y: 50, fontSize: 15 });
  } else if (type === 'single_bin') {
    document.getElementById('preset-size').value = 'standard';
    addElement('text', { text: 'BIN 1A', x: 80, y: 15, fontSize: 34 });
    addElement('barcode', { text: 'BIN-1A', x: 60, y: 75 });
  } else if (type === 'standard') {
    document.getElementById('preset-size').value = 'standard';
    addElement('text', { text: 'SAMPLE TEXT', x: 25, y: 40, fontSize: 20 });
  }
  changeCanvasSize();
}

export function exportEditorLabel(button) {
  if (!elements.length) {
    window.alert('Add at least one element before exporting.');
    return;
  }
  runExport('editor', () => buildEditorSpec({ elements, preset: getCurrentPreset() }), button);
}

export function initEditor() {
  const canvasDropZone = document.getElementById('label-canvas-container');
  canvasDropZone.onclick = () => {
    selectedId = null;
    renderCanvas();
  };
  canvasDropZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    canvasDropZone.classList.add('border-blue-500', 'bg-blue-950/30');
  });
  canvasDropZone.addEventListener('dragleave', () => {
    canvasDropZone.classList.remove('border-blue-500', 'bg-blue-950/30');
  });
  canvasDropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    canvasDropZone.classList.remove('border-blue-500', 'bg-blue-950/30');
    handleImageUpload(event.dataTransfer.files);
  });
}
