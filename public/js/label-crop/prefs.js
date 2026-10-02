// Remember the converter settings (label position, sheet layout, packing slip, rotation,
// output size) in this browser only. Every storage access is guarded: private windows and
// blocked storage fall back to the defaults. Pure apart from the injected storage.

export const PREF_KEY = 'ln.labelcrop.v1';

export const PREF_CHOICES = {
  preset: ['auto', 'letter-top', 'letter-full', 'amazon-return', 'a4-top'],
  layout: ['single', 'two-stack', 'two-side', 'four'],
  slip: ['drop', 'page'],
  rotate: ['auto', '0', '90', '180', '270'],
  size: ['4x6', '100x150'],
};

export const PREF_DEFAULTS = { preset: 'auto', layout: 'single', slip: 'drop', rotate: 'auto', size: '4x6' };

/** Keep only known keys with allowed values; anything else becomes the default. */
export function sanitizePrefs(raw) {
  const out = { ...PREF_DEFAULTS };
  if (raw && typeof raw === 'object') {
    for (const [k, allowed] of Object.entries(PREF_CHOICES)) {
      if (allowed.includes(String(raw[k]))) out[k] = String(raw[k]);
    }
  }
  return out;
}

function defaultStorage() {
  try { return globalThis.localStorage || null; } catch { return null; }
}

export function readPrefs(storage = defaultStorage()) {
  try { return sanitizePrefs(JSON.parse(storage?.getItem(PREF_KEY) || 'null')); } catch { return { ...PREF_DEFAULTS }; }
}

export function writePrefs(prefs, storage = defaultStorage()) {
  try { storage?.setItem(PREF_KEY, JSON.stringify(sanitizePrefs(prefs))); return true; } catch { return false; }
}
