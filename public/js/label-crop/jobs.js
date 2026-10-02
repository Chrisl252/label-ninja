// Turn the planned crops into output jobs for output.js. PDF sources stay vector when pdf-lib
// can read them; locked PDFs fall back to a 300 dpi render of just the crop.

export async function buildJobs(items, { PDFLib, sources, rotationOf, onProgress = () => {} }) {
  const docs = new Map();
  const jobs = [];
  let rastered = 0;
  for (let i = 0; i < items.length; i++) {
    onProgress(i, items.length);
    const item = items[i];
    const src = item.source;
    const rotation = rotationOf(item);
    if (src.kind === 'image') { jobs.push({ kind: 'image', rotation, ...(await sources.cropImage(src, item.rect)) }); continue; }
    if (!docs.has(src.id)) {
      let doc = null;
      try {
        doc = await PDFLib.PDFDocument.load(src.bytes, { ignoreEncryption: true, updateMetadata: false });
        if (doc.isEncrypted) doc = null;
      } catch { doc = null; }
      docs.set(src.id, doc);
    }
    const doc = docs.get(src.id);
    if (doc) {
      jobs.push({ kind: 'pdf', doc, pageIndex: item.pageIndex, rect: item.rect, rotation });
    } else {
      rastered++;
      // The raster is already in display orientation; keep the user's choice relative to it.
      jobs.push({ kind: 'image', rotation, ...(await sources.rasterizePdfCrop(src, item.pageIndex, item.rect)) });
    }
  }
  onProgress(items.length, items.length);
  return { jobs, rastered };
}
