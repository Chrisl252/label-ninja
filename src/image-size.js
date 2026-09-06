// Read dimensions before decoding compressed pixels. Never allocate from image metadata.
import { HttpError } from './http.js';
export function imageSize(binary, mime) {
  const byte = i => binary.charCodeAt(i);
  const u16 = i => byte(i) * 256 + byte(i + 1);
  const u32 = i => u16(i) * 65536 + u16(i + 2);
  const invalid = () => { throw new HttpError(400, 'invalid_image', 'Image dimensions could not be read. Use a valid PNG or JPEG.'); };
  if (mime === 'image/png') {
    if (binary.length < 33 || binary.slice(0, 8) !== '\x89PNG\r\n\x1a\n' ||
        u32(8) !== 13 || binary.slice(12, 16) !== 'IHDR') return invalid();
    return { width: u32(16), height: u32(20) };
  }
  if (byte(0) !== 255 || byte(1) !== 216) return invalid();
  let i = 2;
  while (i + 3 < binary.length) {
    if (byte(i++) !== 255) return invalid();
    while (byte(i) === 255) i++;
    const marker = byte(i++);
    if (marker === 217 || marker === 218) break;
    if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
    const length = u16(i);
    if (length < 2 || i + length > binary.length) return invalid();
    if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker)) {
      if (length < 8) return invalid();
      return { width: u16(i + 5), height: u16(i + 3) };
    }
    i += length;
  }
  return invalid();
}
