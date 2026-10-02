import { readFileSync, writeFileSync } from 'node:fs';
const dom = readFileSync('dom.html', 'utf8');
const json = dom.match(/<pre id="out">([^<]+)<\/pre>/)[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
const out = JSON.parse(json);
const buf = (k) => Buffer.from(out[k].split(',')[1], 'base64');
const P = 'C:/Code/label-ninja.com/lane-free-20261001/public/';
writeFileSync(P + 'apple-touch-icon.png', buf('i180'));
writeFileSync(P + 'assets/icon-192.png', buf('i192'));
writeFileSync(P + 'assets/icon-512.png', buf('i512'));
// ICO with embedded PNGs (16, 32, 48)
const imgs = [['i16',16],['i32',32],['i48',48]].map(([k,s]) => ({ s, d: buf(k) }));
const head = Buffer.alloc(6); head.writeUInt16LE(0,0); head.writeUInt16LE(1,2); head.writeUInt16LE(imgs.length,4);
let off = 6 + 16 * imgs.length; const dirs = [];
for (const im of imgs) { const e = Buffer.alloc(16); e.writeUInt8(im.s,0); e.writeUInt8(im.s,1); e.writeUInt8(0,2); e.writeUInt8(0,3); e.writeUInt16LE(1,4); e.writeUInt16LE(32,6); e.writeUInt32LE(im.d.length,8); e.writeUInt32LE(off,12); off += im.d.length; dirs.push(e); }
writeFileSync(P + 'favicon.ico', Buffer.concat([head, ...dirs, ...imgs.map(i => i.d)]));
// SVG favicon: rounded tile with the 48px logo raster (crisp enough at tab sizes) — keeps the real mark.
writeFileSync(P + 'favicon.svg', `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 64 64"><defs><clipPath id="r"><rect width="64" height="64" rx="12"/></clipPath></defs><image clip-path="url(#r)" width="64" height="64" href="data:image/png;base64,${out.i180.split(',')[1]}"/></svg>\n`);
console.log('ok', Object.keys(out).join(','));
