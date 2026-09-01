// Export job-spec validation — every rejection happens BEFORE any use is consumed.

import { HttpError } from './http.js';
import { LIMITS } from './limits.js';
import { CODE128_CHARSET } from './code128.js';

const TOOLS = ['bin', 'whatnot', 'fnsku', 'editor', 'test_print', 'pdf_convert'];
const COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const IDEM_RE = /^[\x21-\x7e]{8,128}$/;

function isNum(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function dim(value, name) {
  if (!isNum(value) || value <= 0 || value > LIMITS.MAX_DIM_IN) {
    throw new HttpError(400, 'validation_error', `${name} must be a number in (0, ${LIMITS.MAX_DIM_IN}] inches.`);
  }
  return value;
}

function coord(value, name) {
  if (!isNum(value) || value < 0 || value > LIMITS.MAX_DIM_IN) {
    throw new HttpError(400, 'validation_error', `${name} must be a number in [0, ${LIMITS.MAX_DIM_IN}] inches.`);
  }
  return value;
}

function optCoord(el, name) {
  const v = el[name];
  if (v === undefined) return 0;
  return coord(v, name);
}

function optExtent(el, name, def) {
  const v = el[name];
  if (v === undefined) return def;
  if (!isNum(v) || v < 0 || v > LIMITS.MAX_DIM_IN) {
    throw new HttpError(400, 'validation_error', `${name} must be a number in [0, ${LIMITS.MAX_DIM_IN}] inches.`);
  }
  return v;
}

function color(el, name, def) {
  const v = el[name];
  if (v === undefined) return def;
  if (typeof v !== 'string' || !COLOR_RE.test(v)) {
    throw new HttpError(400, 'validation_error', `${name} must be a hex color like #000000.`);
  }
  return v;
}

function base64Bytes(b64) {
  if (typeof b64 !== 'string' || !b64.length) {
    throw new HttpError(400, 'validation_error', 'image data_base64 is required.');
  }
  let bin;
  try {
    bin = atob(b64);
  } catch {
    throw new HttpError(400, 'invalid_image', 'Image data is not valid base64.');
  }
  return bin;
}

function validateImage(el, img) {
  if (el.mime === 'image/webp') {
    throw new HttpError(400, 'unsupported_image_format', 'WebP images are not supported — convert to PNG or JPEG first.');
  }
  if (el.mime !== 'image/png' && el.mime !== 'image/jpeg') {
    throw new HttpError(400, 'unsupported_image_format', 'image.mime must be image/png or image/jpeg.');
  }
  const bin = base64Bytes(el.data_base64);
  if (bin.length > LIMITS.MAX_IMAGE_BYTES) {
    throw new HttpError(400, 'limit_exceeded', `Image exceeds ${LIMITS.MAX_IMAGE_BYTES} bytes decoded.`);
  }
  // Header magic check: PNG 89 50 4E 47, JPEG FF D8 FF.
  const isPng = bin.charCodeAt(0) === 0x89 && bin.charCodeAt(1) === 0x50 && bin.charCodeAt(2) === 0x4e && bin.charCodeAt(3) === 0x47;
  const isJpeg = bin.charCodeAt(0) === 0xff && bin.charCodeAt(1) === 0xd8 && bin.charCodeAt(2) === 0xff;
  if ((el.mime === 'image/png' && !isPng) || (el.mime === 'image/jpeg' && !isJpeg)) {
    throw new HttpError(400, 'invalid_image', 'Image data does not match its declared mime type.');
  }
  img.total += el.data_base64.length;
  if (img.total > LIMITS.MAX_IMAGE_BASE64_TOTAL) {
    throw new HttpError(400, 'limit_exceeded', `Total image payload exceeds ${LIMITS.MAX_IMAGE_BASE64_TOTAL} bytes.`);
  }
}

function validateElement(el, idx, img) {
  if (!el || typeof el !== 'object' || Array.isArray(el)) {
    throw new HttpError(400, 'validation_error', `elements[${idx}] must be an object.`);
  }
  switch (el.type) {
    case 'text': {
      if (typeof el.text !== 'string') throw new HttpError(400, 'validation_error', 'text.text is required.');
      if (el.text.length > LIMITS.MAX_TEXT_CHARS) {
        throw new HttpError(400, 'limit_exceeded', `Text element exceeds ${LIMITS.MAX_TEXT_CHARS} characters.`);
      }
      coord(el.x_in, `elements[${idx}].x_in`);
      coord(el.y_in, `elements[${idx}].y_in`);
      optExtent(el, 'w_in', 0);
      if (!isNum(el.font_size_pt) || el.font_size_pt <= 0 || el.font_size_pt > LIMITS.MAX_FONT_SIZE_PT) {
        throw new HttpError(400, 'validation_error', `elements[${idx}].font_size_pt must be in (0, ${LIMITS.MAX_FONT_SIZE_PT}].`);
      }
      if (el.align !== undefined && !['left', 'center', 'right'].includes(el.align)) {
        throw new HttpError(400, 'validation_error', 'text.align must be left, center, or right.');
      }
      color(el, 'color', '#000000');
      return;
    }
    case 'barcode': {
      if (el.subtype !== undefined && el.subtype !== 'code128') {
        throw new HttpError(400, 'unsupported_barcode_type', 'Only code128 barcodes are supported.');
      }
      if (typeof el.value !== 'string' || el.value.length < 1 || el.value.length > LIMITS.MAX_BARCODE_CHARS) {
        throw new HttpError(400, 'invalid_barcode_value', `Barcode value must be 1-${LIMITS.MAX_BARCODE_CHARS} characters.`);
      }
      if (!CODE128_CHARSET.test(el.value)) {
        throw new HttpError(400, 'invalid_barcode_value', 'Barcode value must be printable ASCII (32-126).');
      }
      coord(el.x_in, `elements[${idx}].x_in`);
      coord(el.y_in, `elements[${idx}].y_in`);
      dim(el.w_in, `elements[${idx}].w_in`);
      dim(el.h_in, `elements[${idx}].h_in`);
      return;
    }
    case 'rect': {
      coord(el.x_in, `elements[${idx}].x_in`);
      coord(el.y_in, `elements[${idx}].y_in`);
      dim(el.w_in, `elements[${idx}].w_in`);
      dim(el.h_in, `elements[${idx}].h_in`);
      const lw = el.line_width_pt;
      if (lw !== undefined && (!isNum(lw) || lw < 0 || lw > LIMITS.MAX_LINE_WIDTH_PT)) {
        throw new HttpError(400, 'validation_error', 'rect.line_width_pt must be in [0, 100].');
      }
      color(el, 'fill', null);
      color(el, 'stroke', null);
      return;
    }
    case 'line': {
      coord(el.x1_in, `elements[${idx}].x1_in`);
      coord(el.y1_in, `elements[${idx}].y1_in`);
      coord(el.x2_in, `elements[${idx}].x2_in`);
      coord(el.y2_in, `elements[${idx}].y2_in`);
      const lw = el.line_width_pt;
      if (lw !== undefined && (!isNum(lw) || lw <= 0 || lw > LIMITS.MAX_LINE_WIDTH_PT)) {
        throw new HttpError(400, 'validation_error', 'line.line_width_pt must be in (0, 100].');
      }
      color(el, 'color', '#000000');
      return;
    }
    case 'image': {
      coord(el.x_in, `elements[${idx}].x_in`);
      coord(el.y_in, `elements[${idx}].y_in`);
      dim(el.w_in, `elements[${idx}].w_in`);
      dim(el.h_in, `elements[${idx}].h_in`);
      validateImage(el, img);
      img.count += 1;
      if (img.count > LIMITS.MAX_IMAGES_PER_PAGE) {
        throw new HttpError(400, 'limit_exceeded', `Max ${LIMITS.MAX_IMAGES_PER_PAGE} images per page.`);
      }
      return;
    }
    default:
      throw new HttpError(400, 'validation_error', `elements[${idx}].type must be text, barcode, rect, line, or image.`);
  }
}

function validatePage(page, pi, img) {
  if (!page || typeof page !== 'object' || Array.isArray(page)) {
    throw new HttpError(400, 'validation_error', `pages[${pi}] must be an object.`);
  }
  dim(page.width_in, `pages[${pi}].width_in`);
  dim(page.height_in, `pages[${pi}].height_in`);
  if (page.orientation !== undefined && !['portrait', 'landscape'].includes(page.orientation)) {
    throw new HttpError(400, 'validation_error', 'page.orientation must be portrait or landscape.');
  }
  if (!Array.isArray(page.elements)) {
    throw new HttpError(400, 'validation_error', `pages[${pi}].elements must be an array.`);
  }
  if (page.elements.length > LIMITS.MAX_ELEMENTS_PER_PAGE) {
    throw new HttpError(400, 'limit_exceeded', `Max ${LIMITS.MAX_ELEMENTS_PER_PAGE} elements per page.`);
  }
  page.elements.forEach((el, i) => validateElement(el, i, img));
}

// Returns a normalized spec or throws HttpError (400/501). Never mutates the body.
export function validateJobSpec(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'validation_error', 'Body must be a JSON object.');
  }
  if (typeof body.idempotency_key !== 'string' || !IDEM_RE.test(body.idempotency_key)) {
    throw new HttpError(400, 'validation_error', 'idempotency_key must be 8-128 printable characters.');
  }
  if (!TOOLS.includes(body.tool)) {
    throw new HttpError(400, 'validation_error', `tool must be one of: ${TOOLS.join(', ')}.`);
  }
  if (body.tool === 'pdf_convert') {
    throw new HttpError(501, 'not_implemented_yet', 'pdf_convert ships in a later release.');
  }
  if (body.format !== 'pdf') {
    throw new HttpError(400, 'validation_error', 'format must be "pdf".');
  }
  const settings = body.settings === undefined || body.settings === null ? {} : body.settings;
  if (typeof settings !== 'object' || Array.isArray(settings)) {
    throw new HttpError(400, 'validation_error', 'settings must be an object.');
  }

  if (body.tool === 'test_print') {
    dim(settings.width_in, 'settings.width_in');
    dim(settings.height_in, 'settings.height_in');
    return {
      idempotency_key: body.idempotency_key,
      tool: body.tool,
      settings: { width_in: settings.width_in, height_in: settings.height_in },
      pages: null, // server renders the diagnostic page itself
    };
  }

  if (!Array.isArray(body.pages) || body.pages.length < 1) {
    throw new HttpError(400, 'validation_error', 'pages must be a non-empty array.');
  }
  if (body.pages.length > LIMITS.MAX_PAGES) {
    throw new HttpError(400, 'limit_exceeded', `Too many pages (max ${LIMITS.MAX_PAGES}).`);
  }
  const img = { count: 0, total: 0 };
  body.pages.forEach((p, i) => validatePage(p, i, img));
  return { idempotency_key: body.idempotency_key, tool: body.tool, settings, pages: body.pages };
}
