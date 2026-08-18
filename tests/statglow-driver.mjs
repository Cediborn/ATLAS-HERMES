// Atlas — verify the gold glow accent on stat cards.
// 1. ::before has a gold radial-gradient (computed style)
// 2. Card content sits above the glow (z-index layering intact)
// 3. Real pixels: top-right of a card is gold-warmed, bottom-left is plain
//    surface, and the accent card glows warmer than a plain card
// Usage: node tests/statglow-driver.mjs [base-url]

import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';

const BASE = process.argv[2] || 'http://127.0.0.1:8123';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9448;
const PROFILE = '/tmp/atlas-statglow-profile';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

rmSync(PROFILE, { recursive: true, force: true });
const checks = [];
function check(name, ok, detail = '') {
  checks.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
}

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

  // Wait for the dashboard stat cards.
  const start2 = Date.now();
  while (Date.now() - start2 < 30000) {
    if (await evaluate(`document.querySelectorAll('.stat-card').length >= 4`)) break;
    await sleep(200);
  }

  // --- 1+2. Computed-style checks ---
  const computed = await evaluate(`(() => {
    const cards = [...document.querySelectorAll('.stat-card')];
    const plain = cards.find((c) => !/stat-card--/.test(c.className)) || cards[0];
    const accent = cards.find((c) => c.classList.contains('stat-card--accent'));
    const bg = getComputedStyle(plain, '::before').backgroundImage;
    const accentBg = accent ? getComputedStyle(accent, '::before').backgroundImage : '';
    const value = plain.querySelector('.stat-card__value');
    const vStyle = getComputedStyle(value);
    return {
      hasPseudo: bg.includes('radial-gradient') && bg.includes('rgba(230, 198, 109'),
      accentStronger: accentBg.includes('0.26'),
      valuePosition: vStyle.position,
      valueZ: vStyle.zIndex,
      valueColor: vStyle.color,
      cardCount: cards.length,
      accentFound: !!accent,
    };
  })()`);
  check('glow ::before has gold radial gradient', computed?.hasPseudo === true, computed?.cardCount + ' cards');
  check('accent card glows stronger (0.26)', computed?.accentStronger === true && computed?.accentFound === true, '');
  check('card content layered above glow', computed?.valuePosition === 'relative' && computed?.valueZ === '1', `${computed?.valuePosition} z=${computed?.valueZ}`);

  // --- 3. Real pixel sampling via screenshot clip ---
  const cardsPx = {};
  const rects = await evaluate(`(() => {
    const cards = [...document.querySelectorAll('.stat-card')];
    const plain = cards.find((c) => !/stat-card--/.test(c.className)) || cards[0];
    const accent = cards.find((c) => c.classList.contains('stat-card--accent')) || cards[0];
    const r = (el) => {
      const b = el.getBoundingClientRect();
      return { x: b.x, y: b.y, w: b.width, h: b.height };
    };
    return { plain: r(plain), accent: r(accent) };
  })()`);
  console.log('DBG rects:', JSON.stringify(rects));

  // Full-viewport screenshot; sample at viewport coordinates directly.
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const fullB64 = shot.result?.data;
  for (const key of ['plain', 'accent']) {
    const { x, y, w, h } = rects[key];
    const sample = await evaluate(`(async () => {
      const b64 = ${JSON.stringify(fullB64)};
      const img = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob());
      const cv = document.createElement('canvas');
      cv.width = img.width; cv.height = img.height;
      const ctx = cv.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const px = (cx, cy) => {
        const d = ctx.getImageData(cx, cy, 1, 1).data;
        return '#' + [d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join('');
      };
      const ox = ${Math.round(x)};
      const oy = ${Math.round(y)};
      const w = ${Math.round(w)};
      const h = ${Math.round(h)};
      // Inside the 12px corner radius: (w-18, 10) is on the card and near the
      // radial glow's center (88% x, -14% y); (10, h-16) is far from the glow.
      return {
        topRight: px(ox + w - 18, oy + 10),
        bottomLeft: px(ox + 10, oy + h - 16),
        topLeft: px(ox + 10, oy + 10),
        size: img.width + 'x' + img.height,
      };
    })()`);
    const tr = sample?.topRight || '';
    const tl = sample?.topLeft || '';
    const bl = sample?.bottomLeft || '';
    cardsPx[key] = { tr, bl };
    const trRgb = [parseInt(tr.slice(1, 3), 16), parseInt(tr.slice(3, 5), 16), parseInt(tr.slice(5, 7), 16)];
    const blRgb = [parseInt(bl.slice(1, 3), 16), parseInt(bl.slice(3, 5), 16), parseInt(bl.slice(5, 7), 16)];
    const warm = trRgb[0] > trRgb[1] && trRgb[1] >= trRgb[2] && trRgb[0] > blRgb[0] + 6;
    const plainBottom = blRgb[0] <= 40 && blRgb[1] <= 42; // dark-theme surface or light near-white
    check(`${key} card: top-right is gold-warmed`, warm, `topRight=${tr} topLeft=${tl} bottomLeft=${bl}`);
    check(`${key} card: bottom-left is plain surface`, plainBottom, bl);
  }

  // The accent card should glow warmer than the plain card.
  const aR = parseInt(cardsPx.accent.tr.slice(1, 3), 16);
  const pR = parseInt(cardsPx.plain.tr.slice(1, 3), 16);
  check('accent card glows warmer than plain', aR > pR + 4, `accent R=${aR} vs plain R=${pR}`);

  check('app zero page exceptions', exceptions.length === 0, exceptions[0] || '');
  ws.close();
} finally {
  chrome.kill();
}

const failed = checks.filter((c) => !c.ok).length;
console.log(failed ? `\n${failed} check(s) FAILED` : '\nALL CHECKS PASS');
process.exitCode = failed ? 1 : 0;
