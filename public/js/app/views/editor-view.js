// Editor view — the Workbench: controls rail + label stage (#mode-editor).
// Static app-only markup rendered once at boot by views/mount.js (kept out of
// index.html so the crawlable page stays small; ids are checked by
// scripts/test-redesign-contract.mjs). Inline LN.* handlers resolve on window.LN.

export const EDITOR_VIEW = `
  <main id="mode-editor" class="bench hidden no-print" aria-labelledby="editor-title">
    <h1 id="editor-title" class="sr-only">Custom label editor</h1>

    <aside class="bench__rail" aria-label="Editor controls">
      <section class="rail__group">
        <h2 class="rail__title">Media preset</h2>
        <div class="field">
          <label class="sr-only" for="preset-size">Thermal media preset</label>
          <select id="preset-size" class="select input--mono" onchange="LN.changeCanvasSize()">
            <optgroup label="Amazon FBA & Dymo Rolls">
              <option value="fnsku">2" x 1" (Dymo 30334 FNSKU)</option>
              <option value="standard" selected>2.25" x 1.25" (Dymo 30336 Multipurpose)</option>
              <option value="address">1.125" x 3.5" (Dymo 30252 Address / Bin)</option>
              <option value="small_sq">1" x 1" (Dymo 30332 Small Square)</option>
              <option value="small_bc">2" x 0.75" (Dymo 30330 Barcode)</option>
              <option value="tiny">1" x 0.5" (25 x 13 mm Tiny)</option>
              <option value="large_multi">2.3125" x 4" (Dymo 30256 Large Multi)</option>
            </optgroup>
            <optgroup label="Rollo, Zebra & Munbyn 4x6">
              <option value="shipping">4" x 6" (Rollo / Zebra Box Shipping)</option>
              <option value="box_3">4" x 3" (Carton Box Inventory)</option>
              <option value="product_3x2">3" x 2" (Whatnot Live Show Number)</option>
              <option value="polybag">2" x 2" (Square Polybag Warning)</option>
              <option value="polybag_large">2.25" x 4" (Polybag Suffocation Warning)</option>
            </optgroup>
          </select>
          <p class="field__hint">Pick the size of the roll in your printer. Every preset exports at its true physical size.</p>
        </div>
      </section>

      <section class="rail__group">
        <h2 class="rail__title">Image &amp; artwork</h2>
        <label for="image-upload" class="dropzone">
          <span class="bars bars--sm dropzone__bars" aria-hidden="true"></span>
          <span class="dropzone__cta">Upload images</span>
          <span class="dropzone__hint">PNG, JPEG, or WebP · up to 8 MB each · uploaded when you export or save</span>
          <input id="image-upload" type="file" accept="image/png,image/jpeg,image/webp" multiple class="sr-only" onchange="LN.handleImageUpload(this.files); this.value = ''">
        </label>
        <p id="image-upload-status" class="rail__status" role="status" aria-live="polite">Choose files or drop them onto the label.</p>
      </section>

      <section class="rail__group">
        <h2 class="rail__title">Add to label</h2>
        <div class="grid grid--2 rail__grid">
          <button type="button" class="btn btn--ghost" onclick="LN.addElement('text')">Text</button>
          <button type="button" class="btn btn--ghost" onclick="LN.addElement('barcode')">Barcode</button>
          <button type="button" class="btn btn--ghost" onclick="LN.addElement('badge')">Price badge</button>
          <button type="button" class="btn btn--ghost" onclick="LN.addElement('box')">Border box</button>
        </div>
      </section>

      <section class="rail__group">
        <h2 class="rail__title">One-click templates</h2>
        <div class="tpl-list">
          <button type="button" class="tpl" onclick="LN.loadTemplate('fnsku')">
            <span class="tpl__name">Amazon FNSKU label</span>
            <span class="tpl__size">2×1</span>
          </button>
          <button type="button" class="tpl" onclick="LN.loadTemplate('shipping_4x6')">
            <span class="tpl__name">4" × 6" thermal shipping label</span>
            <span class="tpl__size">4×6</span>
          </button>
          <button type="button" class="tpl" onclick="LN.loadTemplate('suffocation')">
            <span class="tpl__name">Polybag suffocation warning</span>
            <span class="tpl__size">2×2</span>
          </button>
          <button type="button" class="tpl" onclick="LN.loadTemplate('suffocation_large')">
            <span class="tpl__name">Large suffocation warning</span>
            <span class="tpl__size">2.25×4</span>
          </button>
          <button type="button" class="tpl" onclick="LN.loadTemplate('sold_set')">
            <span class="tpl__name">Sold as set – do not separate</span>
            <span class="tpl__size">2.25×1.25</span>
          </button>
          <button type="button" class="tpl" onclick="LN.loadTemplate('fragile')">
            <span class="tpl__name">Fragile – handle with care</span>
            <span class="tpl__size">2.25×1.25</span>
          </button>
          <button type="button" class="tpl" onclick="LN.loadTemplate('single_bin')">
            <span class="tpl__name">Warehouse bin label</span>
            <span class="tpl__size">BIN 1A</span>
          </button>
        </div>
      </section>
    </aside>

    <section class="bench__stage" aria-label="Label stage">
      <div id="formatting-bar" class="inspector panel panel--tight panel--flat" role="toolbar" aria-label="Inspector">
        <span class="inspector__label">Inspector</span>

        <div id="text-size-controls" class="inspector__ctl">
          <label class="field__label" for="inspector-size">Size</label>
          <input type="range" id="inspector-size" class="range inspector__range" min="10" max="60" value="28" oninput="LN.updateSelectedElement()">
          <span id="size-val" class="inspector__val">28px</span>
        </div>

        <div id="image-size-controls" class="inspector__ctl hidden">
          <label class="field__label" for="inspector-width">Width</label>
          <input type="range" id="inspector-width" class="range inspector__range inspector__range--wide" min="24" max="600" value="120" oninput="LN.updateSelectedElement()">
          <span id="width-val" class="inspector__val">120px</span>
        </div>

        <div class="inspector__text">
          <input type="text" id="inspector-text" class="input input--mono input--sm" aria-label="Selected element content" oninput="LN.updateSelectedElement()" placeholder="Select an element to edit">
        </div>

        <button type="button" class="btn btn--danger btn--sm" onclick="LN.deleteSelectedElement()">Delete</button>
      </div>

      <p class="stage__hint">Drop PNG, JPEG, or WebP artwork onto the label, then drag it into place and resize it in the inspector.</p>

      <div class="stage__bed">
        <div id="label-canvas-container" class="liner bed">
          <div class="bed__plate">
            <span class="ruler-x" aria-hidden="true"></span>
            <span class="ruler-y" aria-hidden="true"></span>
            <div id="label-canvas" class="stock canvas" style="width: 360px; height: 200px;">
              <!-- Canvas elements are rendered by editor.js -->
            </div>
          </div>
        </div>
        <p id="canvas-size-readout" class="bed__readout" aria-live="polite"></p>
      </div>

      <div class="stage__project">
        <span class="field__label">Project</span>
        <span id="project-name-editor" class="project-name">Unsaved</span>
        <span id="project-dirty-editor" class="project-dirty hidden" title="Unsaved changes" aria-label="Unsaved changes"></span>
        <button type="button" class="btn btn--ghost btn--sm" onclick="LN.saveProject('editor', this)">Save project</button>
      </div>

      <div class="stage__export">
        <button type="button" class="btn btn--primary btn--lg" aria-describedby="editor-export-hint" onclick="LN.exportEditorLabel(this)">
          <span class="bars" aria-hidden="true"></span>
          <span>Download PDF</span>
        </button>
        <p id="editor-export-hint" class="stage__export-hint">Exact physical size · free account to download (no card) · print at 100% scale, margins none.</p>
      </div>
    </section>
  </main>
`;
