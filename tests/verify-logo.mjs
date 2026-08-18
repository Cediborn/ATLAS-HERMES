// Atlas — verify assets/favicon.svg renders with the intended structure
// (gold nested triangles on dark) by drawing it into a canvas and sampling
// pixels at known coordinates. Pure CDP, no dependencies.

import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9445;
const PROFILE = '/tmp/atlas-logo-profile';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const svg = readFileSync(join(ROOT, 'assets', 'favicon.svg'), 'utf8');
const S = 512; // render scale
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Expected samples: [x, y, 'gold' | 'dark']
const SAMPLES = [
  [256, 256, 'gold'],   // solid core center
  [256, 160, 'gold'],   // middle band apex (y=10/32)
  [256, 344, 'gold'],   // middle band base centerline (y=21.5/32)
  [256, 424, 'gold'],   // outer stroke base centerline (y=26.5/32)
  [256, 120, 'dark'],   // gap between outer stroke and middle band (y=7.5/32)
  [256, 232, 'dark'],   // gap between middle band and core (y=14.5/32)
  [150, 150, 'dark'],   // background inside rounded rect
  [256, 445, 'dark'],   // below the outer base edge
];

async function main() {
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
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
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

    const html =
      '<!doctype html><html><body style="margin:0"><img id="logo" src="data:image/svg+xml;charset=utf-8,' +
      encodeURIComponent(svg) + `" width="${S}" height="${S}"><canvas id="cv" width="${S}" height="${S}"></canvas>` +
      '<script>' +
      `const img = document.getElementById('logo');
       const cv = document.getElementById('cv');
       const ctx = cv.getContext('2d');
       img.onload = () => {
         ctx.drawImage(img, 0, 0, ${S}, ${S});
         window.__ready = true;
       };` +
      '</script></body></html>';

    await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 800, height: 600, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: 'data:text/html;charset=utf-8,' + encodeURIComponent(html) });

    // Wait until the image has been drawn into the canvas.
    const start2 = Date.now();
    while (Date.now() - start2 < 15000) {
      const r = await send('Runtime.evaluate', { expression: 'window.__ready === true', returnByValue: true });
      if (r.result?.result?.value) break;
      await sleep(200);
    }

    const expr = `(() => {
      const ctx = document.getElementById('cv').getContext('2d');
      const hex = (x, y) => {
        const d = ctx.getImageData(x, y, 1, 1).data;
        return '#' + [d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join('');
      };
      const scan = [];
      for (let y = 60; y <= 340; y += 8) scan.push('y=' + y + ' ' + hex(256, y));
      return { scan, samples: ${JSON.stringify(SAMPLES)}.map(([x, y, kind]) => ({ x, y, kind, hex: hex(x, y) })) };
    })()`;
    const out = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
    const { scan = [], results = [] } = out.result?.result?.value || {};
    console.log('centerline scan (x=256): ' + scan.join(' | '));

    let pass = true;
    for (const r of results) {
      const isGold = r.kind === 'gold';
      const hex = r.hex.toLowerCase();
      const rVal = parseInt(hex.slice(1, 3), 16);
      const gVal = parseInt(hex.slice(3, 5), 16);
      const bVal = parseInt(hex.slice(5, 7), 16);
      const bright = (rVal + gVal + bVal) / 3;
      const goldish = rVal > 170 && gVal > 150 && bVal < 140; // warm gold, not blue/white
      const ok = isGold ? goldish && bright > 160 : bright < 80;
      if (!ok) pass = false;
      console.log(`${ok ? 'PASS' : 'FAIL'} (${r.x},${r.y}) expect ${r.kind} got ${r.hex} (r=${rVal} g=${gVal} b=${bVal})`);
    }
    console.log(pass ? 'LOGO VERIFY: all checks pass' : 'LOGO VERIFY: FAILURES');
    ws.close();
    process.exitCode = pass ? 0 : 1;
  } finally {
    chrome.kill();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
