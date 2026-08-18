// Atlas — generate PNG icons from assets/favicon.svg using headless Chrome.
// No image libraries: the SVG is rasterized in-page onto a canvas and
// exported via toDataURL, which preserves transparency (screenshot capture
// would force an opaque background). All sizes share one Chrome session.
// Usage: node tests/gen-icons.mjs

import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9444;
const PROFILE = '/tmp/atlas-icon-profile';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const svg = readFileSync(join(ROOT, 'assets', 'favicon.svg'), 'utf8');
// Notification badge: the gold triangle mark only (no dark tile) — Android
// renders the badge as a silhouette from its alpha channel.
const badgeSvg = svg.replace(/<rect width="32" height="32" rx="8" fill="#1E1E1E"\/>/, '');
const TARGETS = [
  { size: 192, out: join(ROOT, 'assets', 'icon-192.png'), svg },
  { size: 512, out: join(ROOT, 'assets', 'icon-512.png'), svg },
  { size: 180, out: join(ROOT, 'assets', 'apple-touch-icon.png'), svg },
  { size: 96, out: join(ROOT, 'assets', 'badge.png'), svg: badgeSvg },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  rmSync(PROFILE, { recursive: true, force: true });

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
    if (!list || !list.some((t) => t.type === 'page')) throw new Error('timed out waiting for devtools endpoint');

    const page = list.find((t) => t.type === 'page');
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    let nextId = 0;
    const pending = new Map();
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) {
        pending.get(msg.id)(msg);
        pending.delete(msg.id);
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
    await send('Page.navigate', { url: 'about:blank' });
    await sleep(500);

    for (const t of TARGETS) {
      const sized = t.svg.replace('<svg', `<svg width="${t.size}" height="${t.size}"`);
      const b64 = await evaluate(`(async () => {
        const svg = ${JSON.stringify(sized)};
        const img = new Image();
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
        await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error('svg load failed')); });
        const cv = document.createElement('canvas');
        cv.width = ${t.size}; cv.height = ${t.size};
        const ctx = cv.getContext('2d');
        ctx.drawImage(img, 0, 0, ${t.size}, ${t.size});
        return cv.toDataURL('image/png').split(',')[1];
      })()`);
      if (!b64) throw new Error('no canvas data for ' + t.size);
      const buf = Buffer.from(b64, 'base64');
      writeFileSync(t.out, buf);
      console.log(`wrote ${t.out} (${buf.length} bytes)`);
    }
    ws.close();
  } finally {
    chrome.kill();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
