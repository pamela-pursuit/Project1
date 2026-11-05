#!/usr/bin/env node
// Read-only application discovery for the E2E agent.
//
// Visits the supplied URL and same-origin pages reachable by plain links,
// and records what is observable: titles, routes, headings, ARIA snapshots,
// links, forms and fields, buttons, test ids, console errors, and failed
// requests. It never clicks buttons, submits forms, or follows links that
// look destructive (logout, delete, remove, unsubscribe, ...).
//
// Usage:
//   node scripts/explore-app.mjs --url <url> --app <name> [--max-pages 12]
//        [--path-prefix /shop] [--browser chromium|firefox|webkit] [--headed]
//
// Output: artifacts/<app>/discovery/discovery.json and screens/*.png

import { chromium, firefox, webkit } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DESTRUCTIVE = /log\s*-?out|sign\s*-?out|delete|remove|unsubscribe|deactivate|cancel[-_ ]?(order|subscription|account)|empty[-_ ]?cart|clear[-_ ]?cart|reset/i;
const DOWNLOAD = /\.(pdf|zip|gz|tar|exe|msi|dmg|apk|docx?|xlsx?|pptx?|csv|mp4|mp3|jpg|jpeg|png|gif|svg|webp)(\?|$)/i;

function parseArgs(argv) {
  const args = { maxPages: 12, browser: 'chromium', headed: false };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const next = () => argv[++i];
    if (key === '--url') args.url = next();
    else if (key === '--app') args.app = next();
    else if (key === '--max-pages') args.maxPages = Number(next());
    else if (key === '--path-prefix') args.pathPrefix = next();
    else if (key === '--browser') args.browser = next();
    else if (key === '--headed') args.headed = true;
    else throw new Error(`Unknown argument: ${key}`);
  }
  if (!args.url || !args.app) {
    throw new Error('Usage: node scripts/explore-app.mjs --url <url> --app <name>');
  }
  if (!/^[a-z0-9][a-z0-9-]*$/.test(args.app)) {
    throw new Error('--app must be kebab-case, for example demo-web-shop');
  }
  if (!Number.isInteger(args.maxPages) || args.maxPages < 1) {
    throw new Error('--max-pages must be a positive integer');
  }
  return args;
}

function validateUrl(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`Invalid URL: ${raw}`);
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(`Unsupported URL scheme: ${url.protocol}`);
  }
  return url;
}

function normalize(href) {
  const url = new URL(href);
  url.hash = '';
  return url.toString();
}

async function inspectPage(page) {
  return page.evaluate(() => {
    const text = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
    const labelFor = (el) => {
      if (el.labels && el.labels.length) return text(el.labels[0]);
      const labelledBy = el.getAttribute('aria-labelledby');
      if (labelledBy) {
        return labelledBy
          .split(/\s+/)
          .map((id) => text(document.getElementById(id)))
          .join(' ')
          .trim();
      }
      return el.getAttribute('aria-label') ?? '';
    };
    const visible = (el) => {
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
    };
    const describeField = (el) => ({
      tag: el.tagName.toLowerCase(),
      type: el.getAttribute('type') ?? (el.tagName === 'SELECT' ? 'select' : el.tagName === 'TEXTAREA' ? 'textarea' : 'text'),
      label: labelFor(el),
      placeholder: el.getAttribute('placeholder') ?? '',
      name: el.getAttribute('name') ?? '',
      id: el.id ?? '',
      required: el.required || el.getAttribute('aria-required') === 'true',
      // Framework validation hints (jQuery unobtrusive, Angular, asterisks next to the field).
      requiredHint:
        el.required ||
        el.getAttribute('aria-required') === 'true' ||
        el.hasAttribute('data-val-required') ||
        el.hasAttribute('ng-required') ||
        /\*/.test(el.parentElement?.textContent ?? ''),
      checked: el.type === 'radio' || el.type === 'checkbox' ? el.checked : undefined,
      value: el.type === 'radio' || el.type === 'checkbox' ? el.value : undefined,
      minLength: el.getAttribute('minlength'),
      maxLength: el.getAttribute('maxlength'),
      min: el.getAttribute('min'),
      max: el.getAttribute('max'),
      pattern: el.getAttribute('pattern'),
      autocomplete: el.getAttribute('autocomplete'),
      visible: visible(el),
      options: el.tagName === 'SELECT' ? [...el.options].slice(0, 25).map((o) => text(o)) : undefined
    });
    const buttonName = (el) =>
      el.getAttribute('aria-label') || text(el) || el.getAttribute('value') || el.getAttribute('title') || '';

    const forms = [...document.querySelectorAll('form')].map((form, index) => ({
      index,
      id: form.id ?? '',
      name: form.getAttribute('name') ?? '',
      ariaLabel: form.getAttribute('aria-label') ?? '',
      method: (form.getAttribute('method') ?? 'get').toLowerCase(),
      action: form.action ?? '',
      fields: [...form.querySelectorAll('input:not([type=hidden]), select, textarea')].map(describeField),
      buttons: [...form.querySelectorAll('button, input[type=submit], input[type=button]')]
        .map((b) => ({ name: buttonName(b), type: b.getAttribute('type') ?? 'submit', visible: visible(b) }))
    }));

    const orphanFields = [...document.querySelectorAll('input:not([type=hidden]), select, textarea')]
      .filter((el) => !el.closest('form'))
      .map(describeField);

    return {
      title: document.title,
      lang: document.documentElement.lang ?? '',
      headings: [...document.querySelectorAll('h1, h2, h3')]
        .filter(visible)
        .slice(0, 40)
        .map((h) => ({ level: h.tagName.toLowerCase(), text: text(h) })),
      links: [...document.querySelectorAll('a[href]')].slice(0, 400).map((a) => ({
        name: a.getAttribute('aria-label') || text(a) || a.getAttribute('title') || '',
        href: a.href,
        visible: visible(a)
      })),
      buttons: [...document.querySelectorAll('button, [role=button], input[type=submit], input[type=button]')]
        .filter(visible)
        .slice(0, 100)
        .map((b) => ({ name: buttonName(b), inForm: !!b.closest('form') })),
      forms,
      orphanFields,
      testIds: [...document.querySelectorAll('[data-testid], [data-test], [data-test-id], [data-qa], [data-cy]')]
        .slice(0, 150)
        .map((el) => ({
          attribute: ['data-testid', 'data-test', 'data-test-id', 'data-qa', 'data-cy'].find((a) => el.hasAttribute(a)),
          value: el.getAttribute('data-testid') ?? el.getAttribute('data-test') ?? el.getAttribute('data-test-id') ?? el.getAttribute('data-qa') ?? el.getAttribute('data-cy'),
          tag: el.tagName.toLowerCase()
        })),
      dialogs: [...document.querySelectorAll('dialog, [role=dialog], [role=alertdialog]')].map((d) => ({
        name: d.getAttribute('aria-label') ?? '',
        open: d.hasAttribute('open') || visible(d)
      })),
      tables: [...document.querySelectorAll('table')].slice(0, 10).map((t) => ({
        caption: text(t.caption),
        headers: [...t.querySelectorAll('th')].slice(0, 20).map(text)
      })),
      iframes: [...document.querySelectorAll('iframe')].map((f) => f.src).slice(0, 10)
    };
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const startUrl = validateUrl(args.url);
  const origin = startUrl.origin;
  const outDir = path.join('artifacts', args.app, 'discovery');
  const screenDir = path.join(outDir, 'screens');
  await mkdir(screenDir, { recursive: true });

  const browserType = { chromium, firefox, webkit }[args.browser];
  if (!browserType) throw new Error(`Unknown browser: ${args.browser}`);

  const browser = await browserType.launch({ headless: !args.headed });
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await context.newPage();

  const consoleErrors = [];
  const failedRequests = [];
  let currentUrl = '';
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push({ page: currentUrl, text: msg.text().slice(0, 500) });
  });
  page.on('pageerror', (err) => consoleErrors.push({ page: currentUrl, text: `pageerror: ${err.message}`.slice(0, 500) }));
  page.on('response', (res) => {
    if (res.status() >= 400 && failedRequests.length < 200) {
      failedRequests.push({ page: currentUrl, url: res.url(), status: res.status(), method: res.request().method() });
    }
  });

  const result = {
    tool: 'scripts/explore-app.mjs',
    exploredAt: new Date().toISOString(),
    requestedUrl: startUrl.toString(),
    origin,
    browser: args.browser,
    maxPages: args.maxPages,
    pathPrefix: args.pathPrefix ?? null,
    blockers: [],
    pages: [],
    skippedLinks: [],
    consoleErrors,
    failedRequests,
    signals: {}
  };

  const queue = [normalize(startUrl.toString())];
  const seen = new Set(queue);

  while (queue.length && result.pages.length < args.maxPages) {
    const target = queue.shift();
    currentUrl = target;
    const entry = { requestedUrl: target };
    let response;
    try {
      response = await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    } catch (error) {
      entry.error = error.message.split('\n')[0];
      if (result.pages.length === 0) {
        result.blockers.push({ type: /certificate|SSL|TLS/i.test(entry.error) ? 'certificate' : 'unreachable', detail: entry.error });
      }
      result.pages.push(entry);
      continue;
    }

    // Best-effort settle for discovery only; never used in tests.
    entry.settledNetwork = await page
      .waitForLoadState('networkidle', { timeout: 8_000 })
      .then(() => true, () => false);

    const finalUrl = page.url();
    entry.finalUrl = finalUrl;
    entry.status = response?.status() ?? null;
    const redirects = [];
    for (let req = response?.request().redirectedFrom(); req; req = req.redirectedFrom()) redirects.unshift(req.url());
    entry.redirectChain = redirects;
    entry.leftOrigin = new URL(finalUrl).origin !== origin;
    if (entry.leftOrigin && result.pages.length === 0) {
      result.blockers.push({ type: 'unexpected-host', detail: `Redirected to ${new URL(finalUrl).origin}` });
    }

    Object.assign(entry, await inspectPage(page));
    try {
      entry.ariaSnapshot = (await page.locator('body').ariaSnapshot({ timeout: 10_000 })).slice(0, 20_000);
    } catch (error) {
      entry.ariaSnapshot = null;
      entry.ariaSnapshotError = error.message.split('\n')[0];
    }
    const shot = path.join(screenDir, `${String(result.pages.length + 1).padStart(2, '0')}.png`);
    await page.screenshot({ path: shot, fullPage: true });
    entry.screenshot = shot.replaceAll('\\', '/');
    result.pages.push(entry);

    if (entry.leftOrigin) continue;
    for (const link of entry.links) {
      let url;
      try {
        url = new URL(link.href);
      } catch {
        continue;
      }
      if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin) continue;
      if (args.pathPrefix && !url.pathname.startsWith(args.pathPrefix)) continue;
      const key = normalize(url.toString());
      if (seen.has(key)) continue;
      seen.add(key);
      if (DESTRUCTIVE.test(link.name) || DESTRUCTIVE.test(url.pathname + url.search) || DOWNLOAD.test(url.pathname)) {
        result.skippedLinks.push({ name: link.name, href: key, reason: DOWNLOAD.test(url.pathname) ? 'download' : 'possibly destructive' });
        continue;
      }
      queue.push(key);
    }
  }

  const ok = result.pages.filter((p) => !p.error);
  const allLinks = ok.flatMap((p) => p.links ?? []);
  result.signals = {
    pagesVisited: result.pages.length,
    pagesWithErrors: result.pages.length - ok.length,
    unvisitedQueue: queue.length,
    passwordFieldsOnPages: ok.filter((p) => [...(p.forms ?? []).flatMap((f) => f.fields), ...(p.orphanFields ?? [])].some((f) => f.type === 'password')).map((p) => p.finalUrl),
    authLinks: [...new Set(allLinks.filter((l) => /log\s*-?in|sign\s*-?in|register|sign\s*-?up|account/i.test(l.name)).map((l) => `${l.name} -> ${l.href}`))].slice(0, 20),
    searchFields: ok.flatMap((p) => [
      ...(p.forms ?? []).flatMap((form) => form.fields.map((f) => ({ ...f, action: form.action }))),
      ...(p.orphanFields ?? [])
    ]).filter((f) => f.type === 'search' || /search/i.test(`${f.label} ${f.placeholder} ${f.name} ${f.id} ${f.action ?? ''}`)).length,
    formsTotal: ok.reduce((n, p) => n + (p.forms?.length ?? 0), 0),
    testIdCount: ok.reduce((n, p) => n + (p.testIds?.length ?? 0), 0),
    consoleErrorCount: consoleErrors.length,
    failedRequestCount: failedRequests.length
  };

  await browser.close();
  const outFile = path.join(outDir, 'discovery.json');
  await writeFile(outFile, JSON.stringify(result, null, 2));

  console.log(`Discovery written to ${outFile.replaceAll('\\', '/')}`);
  for (const p of result.pages) {
    console.log(p.error ? `  ERROR ${p.requestedUrl} - ${p.error}` : `  ${p.status} ${p.finalUrl} - "${p.title}" (${p.forms.length} forms)`);
  }
  console.log('Signals:', JSON.stringify(result.signals, null, 2));
  if (result.blockers.length) {
    console.log('BLOCKERS:', JSON.stringify(result.blockers, null, 2));
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
