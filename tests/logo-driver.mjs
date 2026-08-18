// Atlas — verify the new logo end-to-end in one Chrome session:
//  1. Landing nav logo img loads and renders the gold mark (canvas pixel check)
//  2. Manifest exposes PNG icons (192/512) plus the SVG
//  3. Icon PNGs are valid files (PNG magic bytes, non-trivial size)
//  4. App boots with the favicon link and zero page exceptions
// Usage: node tests/logo-driver.mjs [base-url]

import { spawn } from 'node:child_process';

const BASE = process.argv[2] || 'http://127.0.0.1:8123';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9446;
const PROFILE = '/tmp/atlas-logo-driver-profile';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const checks = [];
function check(name, ok, detail = '') {
  checks.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
}

async function main() {
  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    `--user-data-dir=${PROFILE}`, `--remote-debugging-port=${PORT}`, 'about:blank',
  ], { stdio: 'ignore' });

  try {
    // Wait for devtools.
    const start = Date.now();
    let list;
    while (Date.now() - start < 20000) {
      try {
        const r = await fetch(`http://127.0.0.1:${PORT}/json/list`);
        list = await r.json();
        if (list.some((t) => t.type === 'page')) break;
      } catch {}
      await sleep(250);
    }
    if (!list || !list.some((t) => t.type === 'page')) throw new Error('no devtools endpoint');

    const page = list.find((t) => t.type === 'page');
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    let nextId = 0;
    const pending = new Map();
    const exceptions = [];
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
      if (msg.method === 'Runtime.exceptionThrown') {
        exceptions.push(msg.params.exceptionDetails?.exception?.description || msg.params.exceptionDetails?.text || 'unknown');
      }
    });
    await new Promise((res, rej) => {
      ws.addEventListener('open', res, { once: true });
      ws.addEventListener('error', rej, { once: true });
    });
    const send = (method, params = {}) =>
      new Promise((resolve) => {
        const id = ++nextId;
        pending.set(id, resolve);
        ws.send(JSON.stringify({ id, method, params }));
      });
    const evaluate = async (expression, awaitPromise = false) => {
      const r = await send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true });
      return r.result?.result?.value;
    };

    await send('Runtime.enable');
    await send('Page.enable');

    // --- 1. Landing page: nav logo renders the gold mark ---
    await send('Page.navigate', { url: `${BASE}/index.html` });
    await sleep(2500);
    const landing = await evaluate(`(async () => {
      const img = document.querySelector('.landing__logo img');
      if (!img) return { ok: false, why: 'no .landing__logo img' };
      if (!img.complete || img.naturalWidth === 0) {
        await new Promise((res) => { img.onload = res; img.onerror = () => res(); });
      }
      const loaded = img.naturalWidth > 0;
      const cv = document.createElement('canvas');
      cv.width = img.naturalWidth; cv.height = img.naturalHeight;
      const ctx = cv.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const cx = Math.floor(img.naturalWidth / 2);
      const cy = Math.floor(img.naturalHeight / 2);
      const d = ctx.getImageData(cx, cy, 1, 1).data;
      const hex = '#' + [d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join('');
      return { ok: loaded && d[0] > 170 && d[1] > 150 && d[2] < 140, src: img.getAttribute('src'), hex, size: img.naturalWidth };
    })()`, true);
    check('landing nav logo renders gold mark', landing?.ok, `${landing?.src} center=${landing?.hex} ${landing?.size}px`);
    check('landing page zero exceptions', exceptions.length === 0, exceptions[0] || '');

    // --- 4. App boots with favicon link, zero exceptions ---
    await send('Page.navigate', { url: `${BASE}/app/index.html` });
    await sleep(3000);
    const app = await evaluate(`(() => {
      const link = document.querySelector('link[rel="icon"]');
      const apple = document.querySelector('link[rel="apple-touch-icon"]');
      const title = document.querySelector('#page-title')?.textContent;
      return { favicon: link?.getAttribute('href'), apple: apple?.getAttribute('href'), title };
    })()`);
    check('app favicon link present', app?.favicon === '../assets/favicon.svg', app?.favicon || '');
    check('app apple-touch-icon link present', app?.apple === '../assets/apple-touch-icon.png', app?.apple || '');
    check('app boots to dashboard', app?.title === 'Dashboard', app?.title || '');
    check('app zero page exceptions', exceptions.length === 0, exceptions[0] || '');

    ws.close();
  } finally {
    chrome.kill();
  }

  // --- 2. Manifest icons (plain fetch) ---
  const manifest = await (await fetch(`${BASE}/app/manifest.webmanifest`)).json();
  const iconSrcs = (manifest.icons || []).map((i) => i.src);
  check('manifest lists SVG icon', iconSrcs.includes('../assets/favicon.svg'), iconSrcs.join(', '));
  check('manifest lists 192 PNG', iconSrcs.includes('../assets/icon-192.png'), '');
  check('manifest lists 512 PNG', iconSrcs.includes('../assets/icon-512.png'), '');

  // --- 3. PNG files are valid ---
  for (const [path, minSize] of [['assets/icon-192.png', 1000], ['assets/icon-512.png', 5000], ['assets/apple-touch-icon.png', 1000]]) {
    const res = await fetch(`${BASE}/${path}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const magic = buf.subarray(0, 8).toString('hex');
    const ok = res.status === 200 && magic === '89504e470d0a1a0a' && buf.length > minSize;
    check(`PNG valid ${path}`, ok, `${res.status} ${buf.length}B`);
  }

  const failed = checks.filter((c) => !c.ok).length;
  console.log(failed ? `\n${failed} check(s) FAILED` : '\nALL CHECKS PASS');
  process.exitCode = failed ? 1 : 0;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
