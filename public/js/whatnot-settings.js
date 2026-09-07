// Shared, DOM-free contract for the search landing page and metered Whatnot tool.
import { WHATNOT_STOCKS } from './app/presets.js';

export const WHATNOT_TOOL_HASH = '#tools/whatnot-live-show-number-generator';
export const WHATNOT_MAX_PAGES = 200;
const fields = ['stock', 'prefix', 'start', 'end'];

export function validateWhatnotSettings(input) {
  const stock = input.stock;
  if (!Object.hasOwn(WHATNOT_STOCKS, stock)) throw new Error('Choose one of the three label sizes.');
  const prefix = input.prefix ?? '#';
  if (typeof prefix !== 'string' || !/^[\x20-\x7e]{0,12}$/.test(prefix)) {
    throw new Error('Use up to 12 basic letters, numbers or punctuation marks for the prefix.');
  }
  const integer = (value) => /^(?:[1-9]\d{0,2})$/.test(String(value)) ? Number(value) : NaN;
  const start = integer(input.start);
  const end = integer(input.end);
  if (!Number.isInteger(start) || !Number.isInteger(end) || end < start) {
    throw new Error('Use whole numbers from 1 to 999, with the end at or after the start.');
  }
  if (end - start + 1 > WHATNOT_MAX_PAGES) {
    throw new Error('A PDF batch can contain up to 200 numbers. Shorten this range, then make another batch if needed.');
  }
  return { stock, prefix, start, end };
}

export function whatnotToolUrl(input) {
  const settings = validateWhatnotSettings(input);
  const query = new URLSearchParams(fields.map((field) => [`wn-${field}`, String(settings[field])]));
  return `/?${query}${WHATNOT_TOOL_HASH}`;
}

export function whatnotSettingsFromSearch(search) {
  const query = new URLSearchParams(search);
  // Reject incomplete or ambiguous links. Never partially overwrite the current form.
  if (fields.some((field) => query.getAll(`wn-${field}`).length !== 1)) return null;
  try {
    return validateWhatnotSettings(Object.fromEntries(fields.map((field) => [field, query.get(`wn-${field}`)])));
  } catch {
    return null;
  }
}
