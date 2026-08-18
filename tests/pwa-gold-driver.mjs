// Atlas — verify PWA + notification branding is gold.
// 1. Manifest theme_color/background_color are #E6C66D
// 2. app/index.html theme-color meta is #E6C66D
// 3. badge.png is a valid PNG with transparent corners and an opaque mark
// 4. browser-notifications.js references the gold PNG icon + badge
// 5. App boots clean
// Usage: node tests/pwa-gold-driver.mjs [base-url]

import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';

const BASE = process.argv[2] || 'http://127.0.0.1:8123';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9449;
const PROFILE = '/tmp/atlas-pwagold-profile';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

rmSync(PROFILE, { recursive: true, force: true });
const checks = [];
function check(name, ok, detail = '') {
  checks.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
}

// --- 1. Manifest ---
const manifest = await (await fetch(`${BASE}/app/manifest.webmanifest`)).json();
check('manifest theme_color is gold', manifest.theme_color === '#E6C66D', manifest.theme_color);
check('manifest background_color is dark', manifest.background_color === '#0B0C0F', manifest.background_color);

// --- 2. index.html meta ---
const html = await (await fetch(`${BASE}/app/index.html`)).text();
const meta = html.match(/<meta name="theme-color" content="([^"]+)"/)?.[1];
check('index.html theme-color meta is gold', meta === '#E6C66D', meta);

// --- 3. badge.png validity ---
{
  const res = await fetch(`${BASE}/assets/badge.png`);
  const buf = Buffer.from(await res.arrayBuffer());
  const magic = buf.subarray(0, 8).toString('hex');
  check('badge.png is a valid PNG', res.status === 200 && magic === '89504e470d0a1a0a', `${res.status} ${buf.length}B`);
}

// --- 4. browser-notifications.js references ---
const nbJs = await (await fetch(`${BASE}/js/browser-notifications.js`)).text();
check('notifications use gold PNG icon', nbJs.includes("icon: '../assets/icon-192.png'"), '');
check('notifications use badge', nbJs.includes("badge: '../assets/badge.png'"), '');

// --- 3b+5. Badge alpha + app boot in Chrome ---
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  `--user-data-dir=${PROFILE}`, `--remote-debugging-port=${PORT}`, 'about:blank',
], { stdio: 'ignore' });

try {
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
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    return r.result?.result?.value;
  };

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Page.navigate', { url: `${BASE}/app/index.html` });
  const start2 = Date.now();
  while (Date.now() - start2 < 30000) {
    if (await evaluate(`!!document.querySelector('.luna-fab') && !!document.querySelector('.dashboard')`)) break;
    await sleep(200);
  }

  // Badge: transparent corners, opaque center (the gold triangle mark).
  const badge = await evaluate(`(async () => {
    const img = await createImageBitmap(await (await fetch('${BASE}/assets/badge.png')).blob());
    const cv = document.createElement('canvas');
    cv.width = img.width; cv.height = img.height;
    const ctx = cv.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const a = (cx, cy) => ctx.getImageData(cx, cy, 1, 1).data[3];
    return { w: img.width, h: img.height, corner: a(2, 2), center: a(Math.floor(img.width / 2), Math.floor(img.height / 2)) };
  })()`);
  check('badge is square', badge?.w === badge?.h && badge?.w >= 64, `${badge?.w}x${badge?.h}`);
  check('badge corners transparent', badge?.corner === 0, `alpha=${badge?.corner}`);
  check('badge center opaque (mark)', badge?.center > 200, `alpha=${badge?.center}`);
  check('app boots clean', await evaluate(`document.querySelector('.dashboard') !== null`));
  check('app zero page exceptions', exceptions.length === 0, exceptions[0] || '');

  ws.close();
} finally {
  chrome.kill();
}

const failed = checks.filter((c) => !c.ok).length;
console.log(failed ? `\n${failed} check(s) FAILED` : '\nALL CHECKS PASS');
process.exitCode = failed ? 1 : 0;
