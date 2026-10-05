// Read-only content gate. Never requests Amazon URLs or changes account settings.
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, relative, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(readFileSync(join(root, 'config/affiliates.json'), 'utf8')).amazon;
const errors = [];
const pages = [];
const statement = 'As an Amazon Associate I earn from qualifying purchases.';
const fail = (message) => errors.push(message);

function htmlFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? htmlFiles(path) : entry.name.endsWith('.html') ? [path] : [];
  });
}

function decode(value) {
  return value.replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)));
}

function attributes(markup) {
  const result = {};
  for (const match of markup.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    result[match[1].toLowerCase()] = decode(match[2] ?? match[3]);
  }
  return result;
}

if (!/^[a-z0-9-]+-20$/.test(config.tag) || !config.tagVerifiedOn) {
  fail('Configure a verified US Amazon tag before preparing shopping links.');
}

for (const path of htmlFiles(join(root, 'public'))) {
  const html = readFileSync(path, 'utf8');
  const name = relative(root, path).replaceAll('\\', '/');
  const sections = [];
  let count = 0;
  // Track the nearest section, so a footer disclosure cannot satisfy a shopping table.
  for (const token of html.matchAll(/<section\b[^>]*>|<\/section\s*>|<a\b[^>]*>/gi)) {
    if (/^<section\b/i.test(token[0])) {
      sections.push(token.index);
      continue;
    }
    if (/^<\/section/i.test(token[0])) {
      sections.pop();
      continue;
    }
    const attrs = attributes(token[0]);
    if (!attrs.href) continue;
    let url;
    try { url = new URL(attrs.href, config.site); } catch {
      fail(`${name}: invalid href ${attrs.href}`);
      continue;
    }
    const marked = attrs['data-affiliate'] === 'amazon';
    const amazon = ['amazon.com', 'www.amazon.com', 'amzn.to'].includes(url.hostname);
    if (!amazon && !marked) continue;
    // Retailer privacy/help citations remain ordinary source links.
    if (amazon && url.pathname === '/gp/help/customer/display.html' && !marked) {
      if (url.searchParams.has('tag')) fail(`${name}: do not affiliate-tag Amazon help/privacy citations`);
      continue;
    }
    count++;
    const where = `${name}:${html.slice(0, token.index).split('\n').length}`;
    if (url.protocol !== 'https:' || url.hostname !== 'www.amazon.com') fail(`${where}: use an auditable HTTPS Amazon shopping URL`);
    if (!marked) fail(`${where}: shopping link missing data-affiliate="amazon"`);
    if (url.searchParams.getAll('tag').length !== 1 || url.searchParams.get('tag') !== config.tag) fail(`${where}: missing or incorrect affiliate tag`);
    const rel = new Set((attrs.rel || '').split(/\s+/));
    if (!rel.has('sponsored') || !rel.has('noopener') || attrs.target !== '_blank') fail(`${where}: shopping links require sponsored noopener and target=_blank`);
    const before = sections.length ? html.slice(sections.at(-1), token.index) : '';
    const disclosures = [...before.matchAll(/<p\b[^>]*data-affiliate-disclosure="amazon"[^>]*>([\s\S]*?)<\/p>/g)];
    if (!disclosures.some((match) => match[1].includes(statement) && match[1].includes('/privacy#shopping-links'))) {
      fail(`${where}: missing disclosure before the link in the same section`);
    }
  }
  if (count) pages.push({ page: name, links: count });
}

const privacy = readFileSync(join(root, 'public/privacy.html'), 'utf8');
if (!privacy.includes('id="shopping-links"') || !privacy.includes(statement)) fail('Privacy policy needs a shopping-links section and Associate disclosure.');
if (!pages.length) fail('No Amazon shopping links found.');

const release = process.argv.includes('--release');
if (release && (config.websiteListed !== true || !config.websiteListCheckedOn)) {
  fail('RELEASE BLOCKED: label-ninja.com is not verified in this Associates store\'s website list. Obtain owner approval, add the site and verify it before publication.');
}
console.log(JSON.stringify({ mode: release ? 'release' : 'local', pages, totalLinks: pages.reduce((sum, page) => sum + page.links, 0), websiteListed: config.websiteListed, errors }, null, 2));
if (!release && !config.websiteListed) console.log('Local content checked; registration and publication remain pending.');
process.exitCode = errors.length ? 1 : 0;
