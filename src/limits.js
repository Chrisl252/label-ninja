// Export pipeline caps — configurable constants, enforced pre-consumption.

export const LIMITS = {
  MAX_BODY_BYTES: 10 * 1024 * 1024, // export spec JSON (auth endpoints stay at 100KB)
  MAX_PAGES: 200,
  MAX_ELEMENTS_PER_PAGE: 200,
  MAX_TEXT_CHARS: 2000,
  MAX_IMAGES_PER_PAGE: 20,
  MAX_IMAGE_BASE64_TOTAL: 8 * 1024 * 1024, // sum across the whole spec
  MAX_IMAGE_BYTES: 4 * 1024 * 1024, // per image, decoded
  MAX_DIM_IN: 100,
  MAX_FONT_SIZE_PT: 400,
  MAX_LINE_WIDTH_PT: 100,
  MAX_BARCODE_CHARS: 200,
  EXPORTS_PER_HOUR: 30, // per user
  CHUNK_BYTES: 400 * 1024, // D1 blob chunk size
  MAX_CHUNKS: 96, // 38.4MB hard ceiling on a single output
  OUTPUT_TTL_MS: 7 * 24 * 60 * 60 * 1000, // 7-day expiry
  HISTORY_DEFAULT_LIMIT: 50,
  HISTORY_MAX_LIMIT: 100,
  CLEANUP_BATCH: 50, // expired jobs flipped per lazy-cleanup pass
};
