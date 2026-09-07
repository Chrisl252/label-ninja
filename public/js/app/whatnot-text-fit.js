// Helvetica Bold ASCII advance widths (1/1000 em), matching the PDF renderer.
// Generated from the installed pdf-lib StandardFonts.HelveticaBold metrics.
// Tests compare every entry and worst-case prefixes against that actual font.
const advances = [
  278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,
  556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,
  975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,
  667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,
  333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,
  611,611,389,556,333,611,556,778,556,556,500,389,280,389,584,
];

export function whatnotTextWidthEm(text) {
  return [...String(text)].reduce((total, char) => total + (advances[char.charCodeAt(0) - 32] ?? 1000), 0) / 1000;
}

export function fitWhatnotTextIn(text, stock) {
  const available = Math.min(stock.width * 0.9, (stock.width - 2 * (stock.padding ?? 0)) * 0.95);
  const widthLimit = available / Math.max(0.001, whatnotTextWidthEm(text));
  return Math.max(1 / 72, Math.min(stock.height * 0.72, widthLimit));
}
