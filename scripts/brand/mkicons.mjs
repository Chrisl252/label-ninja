import { readFileSync, writeFileSync } from 'node:fs';
const logo = readFileSync('C:/Code/label-ninja.com/lane-free-20261001/public/assets/logo.jpg').toString('base64');
const html = `<!doctype html><html><body><script>
const img = new Image();
img.onload = () => {
  const out = {};
  for (const [name, size, crop] of [['i16',16,[230,230,564]],['i32',32,[215,215,594]],['i48',48,[205,205,614]],['i180',180,[150,150,724]],['i192',192,[150,150,724]],['i512',512,[120,120,784]]]) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d'); g.imageSmoothingQuality = 'high';
    g.drawImage(img, crop[0], crop[1], crop[2], crop[2], 0, 0, size, size);
    out[name] = c.toDataURL('image/png');
  }
  const pre = document.createElement('pre'); pre.id = 'out'; pre.textContent = JSON.stringify(out); document.body.appendChild(pre);
};
img.src = 'data:image/jpeg;base64,${logo}';
</script></body></html>`;
writeFileSync('icons.html', html);
