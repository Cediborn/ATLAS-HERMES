// Atlas — generate PNG icons from assets/favicon.svg using headless Chrome.
// No image libraries: renders the SVG in a page at the target size and
// captures the viewport via CDP Page.captureScreenshot. All sizes are
// captured in a single Chrome session.
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
const TARGETS = [
  { size: 192, out: join(ROOT, 'assets', 'icon-192.png') },
  { size: 512, out: join(ROOT, 'assets', 'icon-512.png') },
  { size: 180, out: join(ROOT, 'assets', 'apple-touch-icon.png') },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  rmSync(PROFILE, { recursive: true, force: true });

  const chrome = spawn(CHROME, [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${PROFILE}`,
    `--remote-debugging-port=${PORT}`,
    'about:blank',
  ], { stdio: 'ignore' });

  try {
    // Wait for the devtools endpoint.
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

    await send('Page.enable');

    for (const t of TARGETS) {
      const html =
        '<!doctype html><html><head><style>html,body{margin:0;padding:0;background:#000;overflow:hidden}</style></head><body>' +
        svg.replace('<svg', `<svg width="${t.size}" height="${t.size}"`).replace('</svg>', '</svg>') +
        '</body></html>';
      await send('Emulation.setDeviceMetricsOverride', {
        width: t.size,
        height: t.size,
        deviceScaleFactor: 1,
        mobile: false,
      });
      await send('Page.navigate', { url: 'data:text/html;charset=utf-8,' + encodeURIComponent(html) });
      await sleep(1200); // let the SVG rasterize

      const shot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
      const b64 = shot.result?.data;
      if (!b64) throw new Error('no screenshot data for ' + t.size);
      writeFileSync(t.out, Buffer.from(b64, 'base64'));
      console.log(`wrote ${t.out} (${Buffer.from(b64, 'base64').length} bytes)`);
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
