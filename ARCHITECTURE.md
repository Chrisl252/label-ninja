# ARCHITECTURE.md — Label Ninja Module Map

## 1. Overview & Request Flow

Label Ninja is built for zero-latency client-side processing to eliminate server costs and ensure 100% data privacy for sellers.

```
[ User Input / CSV ] ---> [ Form Controls / Presets ] ---> [ JsBarcode / Canvas Engine ]
                                                                   |
                                                                   v
                                                       [ PDFMake / Vector Render ] ---> [ Thermal Printer PDF Output ]
```

---

## 2. Directory Layout & Modules

```
label-ninja/
├── GEMINI.md             # Project bootloader
├── PROJECT_STATE.md      # State snapshot
├── ARCHITECTURE.md       # Module map
├── CONTRIBUTING.md       # Developer conventions
├── DECISIONS_LOG.md      # Decision log
├── BACKLOG.md            # Work items
├── RUNBOOKS.md           # Operational guides
├── SYSTEM_REFERENCE.md   # Port & host layout
├── OPERATING_GUIDE.md    # Principles
└── public/
    ├── index.html        # App UI & layout
    ├── app.js            # Reactive state & barcode binding
    ├── styles.css        # Tailwind / custom print CSS
    └── lib/              # Client-side vendor scripts (JsBarcode, pdfmake)
```

---

## 3. Module Inventory

| Module | Location | Description |
|---|---|---|
| **UI Shell** | `public/index.html` | Clean, responsive single-page studio layout |
| **Barcode Engine** | `public/app.js` | Generates crisp 1D/2D barcodes via `JsBarcode` |
| **PDF Generator** | `public/app.js` | Formats precise inch-based canvas & PDF outputs for thermal printers |
| **Preset Configurator**| `public/app.js` | Holds label specs (Dymo 30334, 30336, 4x6 Rollo) |
