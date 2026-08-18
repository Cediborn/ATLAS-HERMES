// Atlas — verify the gold accent, branded splash, and logo workspace avatar.
// 1. Served HTML contains the splash markup and the logo workspace badge
// 2. App boots, splash is removed after load, zero page exceptions
// 3. Accent is gold: .luna-fab / .btn--primary use #E6C66D with dark text
// 4. Workspace badge renders the logo (gold mark on dark tile)
// Usage: node tests/gold-driver.mjs [base-url]

import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';

const BASE = process.argv[2] || 'http://127.0.0.1:8123';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9447;
const PROFILE = '/tmp/atlas-gold-driver-profile';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Fresh profile every run — a reused one lets the service worker serve
// stale cached CSS and produce false failures after a deploy.
rmSync(PROFILE, { recursive: true, force: true });

const checks = [];
function check(name, ok, detail = '') {
  checks.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
}

// --- 1. Served HTML ---
const html = await (await fetch(`${BASE}/app/index.html`)).text();
check('splash markup in app HTML', html.includes('class="splash" id="splash"'), '');
check('splash wordmark in app HTML', html.includes('splash__wordmark') && html.includes('>Atlas</span>'), '');
check('logo workspace badge in app HTML', /workspace-switcher__badge[^>]*>\s*<svg/.test(html), '');

// --- 2+3+4. App in Chrome ---
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

  // Splash branding: gold background + dark wordmark, matching the PWA splash.
  // Wait until the stylesheet applies (app-shell.css holds the splash rules) —
  // on a fresh profile it loads a beat after first paint. The splash stays
  // visible for seconds while IndexedDB seeds, so there's no race with removal.
  const settleStart = Date.now();
  while (Date.now() - settleStart < 12000) {
    const bg = await evaluate(`(() => { const s = document.getElementById('splash'); return s ? getComputedStyle(s).backgroundColor : 'gone'; })()`);
    if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'gone') break;
    await sleep(100);
  }
  const splashBrand = await evaluate(`(() => {
    const s = document.getElementById('splash');
    if (!s) return null;
    const cs = getComputedStyle(s);
    const wm = s.querySelector('.splash__wordmark');
    return { bg: cs.backgroundColor, wm: wm ? getComputedStyle(wm).color : null };
  })()`);
  check('splash background is gold', splashBrand?.bg === 'rgb(230, 198, 109)', splashBrand?.bg || 'no splash');
  check('splash wordmark is dark on gold', splashBrand?.wm === 'rgb(20, 21, 26)', splashBrand?.wm || '');

  // Wait for the app to actually boot: LUNA FAB present (JS loaded) and the
  // dashboard rendered (data layer hydrated + first paint).
  const start2 = Date.now();
  while (Date.now() - start2 < 30000) {
    const ready = await evaluate(`!!document.querySelector('.luna-fab') && !!document.querySelector('.dashboard')`);
    if (ready) break;
    await sleep(200);
  }
  // Wait for the splash to fade out and be removed from the DOM.
  const start3 = Date.now();
  while (Date.now() - start3 < 15000) {
    const gone = await evaluate(`!document.getElementById('splash')`);
    if (gone) break;
    await sleep(200);
  }

  const app = await evaluate(`(async () => {
    const cs = (el) => getComputedStyle(el);
    const luna = document.querySelector('.luna-fab');
    // No .btn--primary lives on the dashboard; probe the class directly.
    const probe = document.createElement('button');
    probe.className = 'btn btn--primary';
    document.body.appendChild(probe);
    const primaryColor = cs(probe).color;
    const primaryBg = cs(probe).backgroundColor;
    probe.remove();
    const badgeSvg = document.querySelector('#workspace-badge svg');
    const rectFill = badgeSvg?.querySelector('rect')?.getAttribute('fill');
    const hasGoldStroke = [...(badgeSvg?.querySelectorAll('polygon') || [])].some((p) => p.getAttribute('stroke') === '#E6C66D');
    // Sample the badge's rendered center pixel (gold core) via canvas.
    let badgeCenter = null;
    if (badgeSvg) {
      const s = badgeSvg.getBBox ? null : null;
      const w = badgeSvg.viewBox.baseVal.width || 32;
      const h = badgeSvg.viewBox.baseVal.height || 32;
      const cv = document.createElement('canvas');
      cv.width = 64; cv.height = 64;
      const ctx = cv.getContext('2d');
      const img = new Image();
      const xml = new XMLSerializer().serializeToString(badgeSvg);
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
      await new Promise((res) => { img.onload = res; img.onerror = res; });
      ctx.drawImage(img, 0, 0, 64, 64);
      const d = ctx.getImageData(32, 32, 1, 1).data;
      badgeCenter = '#' + [d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join('');
    }
    return {
      splashGone: !document.getElementById('splash'),
      lunaBg: luna ? cs(luna).backgroundColor : null,
      lunaColor: luna ? cs(luna).color : null,
      primaryColor,
      primaryBg,
      badgeSvg: !!badgeSvg,
      rectFill,
      hasGoldStroke,
      badgeCenter,
    };
  })()`);

  const GOLD = 'rgb(230, 198, 109)';
  const DARK = 'rgb(20, 21, 26)'; // #14151A
  check('splash removed after boot', app?.splashGone === true, '');
  check('LUNA FAB is gold', app?.lunaBg === GOLD, app?.lunaBg || '');
  check('LUNA FAB text is dark on gold', app?.lunaColor === DARK, app?.lunaColor || '');
  check('primary button is gold', app?.primaryBg === GOLD, app?.primaryBg || '');
  check('primary button text is dark on gold', app?.primaryColor === DARK, app?.primaryColor || '');
  check('workspace badge renders logo svg', app?.badgeSvg === true, '');
  check('badge logo dark tile', app?.rectFill === '#1E1E1E', app?.rectFill || '');
  check('badge logo gold triangles', app?.hasGoldStroke === true, '');
  check('badge center pixel is gold', app?.badgeCenter === '#e6c66d', app?.badgeCenter || '');
  check('app zero page exceptions', exceptions.length === 0, exceptions[0] || '');

  ws.close();
} finally {
  chrome.kill();
}

const failed = checks.filter((c) => !c.ok).length;
console.log(failed ? `\n${failed} check(s) FAILED` : '\nALL CHECKS PASS');
process.exitCode = failed ? 1 : 0;
