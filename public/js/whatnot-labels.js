// Public batch setup: no account data, credentials, exports or quota mutations.
import { WHATNOT_STOCKS } from './app/presets.js';
import { validateWhatnotSettings, whatnotToolUrl } from './whatnot-settings.js';

const form = document.getElementById('whatnot-setup');
const summary = document.getElementById('batch-summary');
const error = document.getElementById('batch-error');
const label = document.getElementById('number-preview');
const caption = document.getElementById('preview-caption');
const read = () => Object.fromEntries(new FormData(form));

function update() {
  try {
    const settings = validateWhatnotSettings(read());
    const stock = WHATNOT_STOCKS[settings.stock];
    label.textContent = `${settings.prefix}${settings.start}`;
    label.style.aspectRatio = `${stock.width} / ${stock.height}`;
    label.style.fontSize = `${Math.min(6, 15 / Math.max(label.textContent.length, 1))}rem`;
    caption.textContent = `${stock.name} · first label · preview is not to scale`;
    summary.textContent = `${settings.end - settings.start + 1} labels in 1 PDF batch`;
    error.textContent = '';
    return settings;
  } catch (issue) {
    summary.textContent = 'Check your batch settings';
    error.textContent = issue.message;
    label.textContent = '—';
    caption.textContent = 'Preview unavailable until the settings are valid';
    return null;
  }
}

form.addEventListener('input', update);
form.addEventListener('change', update);
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const settings = update();
  if (settings) window.location.assign(whatnotToolUrl(settings));
  else error.focus();
});
update();
