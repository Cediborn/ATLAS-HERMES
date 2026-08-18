// Atlas — Landing page command-palette demo browser test.
// Verifies the hero demo animation works on desktop, mobile, and in
// reduced-motion mode (with opt-in control).
//
// Uses only Node built-ins (WebSocket + fetch + http). Starts a local
// HTTP server, launches Chrome with CDP, and evaluates DOM assertions.
//
// Run: node tests/landing-demo-test.mjs

import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ---- Chrome discovery ----
const CHROME_CANDIDATES = [
  process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

let CHROME = null;
for (const p of CHROME_CANDIDATES) {
  if (existsSync(p)) { CHROME = p; break; }
}
if (!CHROME) {
  console.error('Chrome not found. Set CHROME env var or install Chrome.');
  process.exit(1);
}
console.log(`Chrome: ${CHROME}`);

// ---- MIME types ----
const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

// ---- Helpers ----
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- HTTP server to serve the static files ----
function startServer() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      let filePath = join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (filePath.endsWith('/')) filePath = join(filePath, 'index.html');
      try {
        const data = readFileSync(filePath);
        const ext = extname(filePath);
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        res.end(data);
      } catch {
        res.writeHead(404);
        res.end('Not found');
      }
    });
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });
}

// ---- CDP driver ----
async function withCDP(url, { viewport, reducedMotion }, fn) {
  const PROFILE = mkdtempSync(join(tmpdir(), 'atlas-landing-'));
  const PORT = 9400 + Math.floor(Math.random() * 600);
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    `--user-data-dir=${PROFILE}`,
    `--remote-debugging-port=${PORT}`,
    `--window-size=${viewport.width},${viewport.height}`,
  ];
  args.push('about:blank');

  const chrome = spawn(CHROME, args, { stdio: 'ignore' });
  let ws = null;

  try {
    // Wait for CDP endpoint
    const startWait = Date.now();
    while (Date.now() - startWait < 10000) {
      try {
        const r = await fetch(`http://127.0.0.1:${PORT}/json/list`);
        const list = await r.json();
        if (list.some((t) => t.type === 'page')) break;
      } catch { /* retry */ }
      await sleep(200);
    }

    const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    const page = list.find((t) => t.type === 'page');
    if (!page) throw new Error('No page found');

    ws = new WebSocket(page.webSocketDebuggerUrl);

    let nextId = 0;
    const pending = new Map();
    const exceptions = [];

    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) {
        pending.get(msg.id)(msg);
        pending.delete(msg.id);
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        exceptions.push(msg.params.exceptionDetails?.exception?.description || msg.params.exceptionDetails?.text || 'unknown');
      }
    });

    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true });
      ws.addEventListener('error', reject, { once: true });
    });

    const send = (method, params = {}) =>
      new Promise((resolve) => {
        const id = ++nextId;
        pending.set(id, resolve);
        ws.send(JSON.stringify({ id, method, params }));
      });

    const evaluate = async (expression) => {
      const res = await send('Runtime.evaluate', {
        expression,
        awaitPromise: true,
        returnByValue: true,
      });
      return res.result?.result?.value;
    };

    await send('Runtime.enable');
    await send('Page.enable');

    // Override prefers-reduced-motion before any page script runs.
    await send('Page.addScriptToEvaluateOnNewDocument', {
      source: `
        (function() {
          var realMatchMedia = window.matchMedia.bind(window);
          window.matchMedia = function(q) {
            var m = realMatchMedia(q);
            if (q === '(prefers-reduced-motion: reduce)') {
              return { matches: ${reducedMotion}, media: m.media, addEventListener: m.addEventListener.bind(m), removeEventListener: m.removeEventListener.bind(m), dispatchEvent: m.dispatchEvent.bind(m) };
            }
            return m;
          };
        })();
      `,
    });

    // Navigate
    await send('Page.navigate', { url });

    // Wait for the landing module to load — poll for non-empty typed text
    const moduleReady = await (async () => {
      const deadline = Date.now() + 20000;
      while (Date.now() < deadline) {
        const text = await evaluate('document.getElementById("palette-typed")?.textContent ?? ""');
        if (text && text.length > 0) return true;
        await sleep(300);
      }
      return false;
    })();

    if (!moduleReady) {
      console.log('  WARNING: Landing module did not load within 20s');
    }

    const results = await fn({ send, evaluate, exceptions });
    return results;
  } finally {
    if (ws) ws.close();
    chrome.kill();
    try { rmSync(PROFILE, { recursive: true, force: true }); } catch {}
  }
}

// ---- Test runner ----
const testResults = [];
function check(name, passed, detail = '') {
  testResults.push({ name, passed, detail });
  const icon = passed ? '✓' : '✗';
  console.log(`  ${icon} ${name}${detail ? ' — ' + detail : ''}`);
}

async function run() {
  const { server, port: httpPort } = await startServer();
  const baseUrl = `http://127.0.0.1:${httpPort}`;
  console.log(`HTTP server: ${baseUrl}`);

  try {
    // ==============================
    // Scenario 1: Desktop (normal motion)
    // ==============================
    console.log('\n=== Desktop (normal motion) ===');
    await withCDP(`${baseUrl}/index.html`, { viewport: { width: 1280, height: 720 }, reducedMotion: false }, async ({ evaluate, exceptions }) => {
      check('No JS errors', exceptions.length === 0, exceptions.join('; '));

      const typed1 = await evaluate('document.getElementById("palette-typed")?.textContent ?? ""');
      check('Typed text is populated', typed1.length > 0, `got: "${typed1}"`);

      // Wait for the first demo to type and reveal result
      await sleep(3000);
      const typed2 = await evaluate('document.getElementById("palette-typed")?.textContent ?? ""');
      check('Typed text changes over time', typed1 !== typed2 || typed1.length > 5, `first: "${typed1}", later: "${typed2}"`);

      // Poll for result visibility
      const resultVisible = await (async () => {
        const deadline = Date.now() + 6000;
        while (Date.now() < deadline) {
          const v = await evaluate('document.getElementById("palette-result")?.classList.contains("is-visible")');
          if (v) return true;
          await sleep(300);
        }
        return false;
      })();
      check('Result becomes visible', resultVisible);

      const replayHidden = await evaluate('document.getElementById("palette-replay")?.hidden');
      check('Replay button hidden in normal mode', replayHidden === true);
    });

    await sleep(500);

    // ==============================
    // Scenario 2: Mobile (normal motion)
    // ==============================
    console.log('\n=== Mobile (normal motion) ===');
    await withCDP(`${baseUrl}/index.html`, { viewport: { width: 375, height: 667 }, reducedMotion: false }, async ({ evaluate, exceptions }) => {
      check('No JS errors', exceptions.length === 0, exceptions.join('; '));

      const typed1 = await evaluate('document.getElementById("palette-typed")?.textContent ?? ""');
      check('Typed text is populated', typed1.length > 0, `got: "${typed1}"`);

      // Wait for first demo cycle
      await sleep(3000);
      const typed2 = await evaluate('document.getElementById("palette-typed")?.textContent ?? ""');
      check('Typed text changes over time', typed1 !== typed2 || typed1.length > 5, `first: "${typed1}", later: "${typed2}"`);

      const resultVisible = await (async () => {
        const deadline = Date.now() + 6000;
        while (Date.now() < deadline) {
          const v = await evaluate('document.getElementById("palette-result")?.classList.contains("is-visible")');
          if (v) return true;
          await sleep(300);
        }
        return false;
      })();
      check('Result becomes visible', resultVisible);

      const overflow = await evaluate(`(() => {
        const el = document.querySelector('.palette-demo__typed');
        if (!el) return 'no-element';
        return el.scrollWidth > el.clientWidth + 2 ? 'overflow' : 'ok';
      })()`);
      check('No text overflow on mobile', overflow === 'ok', overflow);
    });

    await sleep(500);

    // ==============================
    // Scenario 3: Reduced motion
    // ==============================
    console.log('\n=== Reduced motion ===');
    await withCDP(`${baseUrl}/index.html`, { viewport: { width: 1280, height: 720 }, reducedMotion: true }, async ({ evaluate, exceptions }) => {
      check('No JS errors', exceptions.length === 0, exceptions.join('; '));

      const typed = await evaluate('document.getElementById("palette-typed")?.textContent ?? ""');
      check('Static typed text is set', typed === 'build atlas', `got: "${typed}"`);

      const resultVisible = await evaluate('document.getElementById("palette-result")?.classList.contains("is-visible")');
      check('Static result is visible', resultVisible === true);

      const replayNotHidden = await evaluate('!document.getElementById("palette-replay")?.hidden');
      check('Replay button is visible', replayNotHidden === true);

      const replayLabel = await evaluate('document.getElementById("palette-replay")?.textContent?.trim() ?? ""');
      check('Replay button says "Play demo"', replayLabel.includes('Play demo'), `got: "${replayLabel}"`);

      // Click replay → animation starts
      await evaluate('document.getElementById("palette-replay")?.click()');
      await sleep(5000);

      const typedAfterReplay = await evaluate('document.getElementById("palette-typed")?.textContent ?? ""');
      check('Replay starts animation (typed changes)', typedAfterReplay !== 'build atlas', `got: "${typedAfterReplay}"`);

      const stopLabel = await evaluate('document.getElementById("palette-replay")?.textContent?.trim() ?? ""');
      check('Button changes to "Stop demo"', stopLabel.includes('Stop demo'), `got: "${stopLabel}"`);

      // Stop the demo
      await evaluate('document.getElementById("palette-replay")?.click()');
      await sleep(500);

      const playLabel = await evaluate('document.getElementById("palette-replay")?.textContent?.trim() ?? ""');
      check('Button returns to "Play demo"', playLabel.includes('Play demo'), `got: "${playLabel}"`);
    });
  } finally {
    server.close();
  }

  // ==============================
  // Summary
  // ==============================
  const passed = testResults.filter((r) => r.passed).length;
  const failed = testResults.filter((r) => !r.passed).length;
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Results: ${passed} passed, ${failed} failed, ${testResults.length} total`);
  if (failed > 0) {
    console.log('\nFailures:');
    for (const r of testResults.filter((r) => !r.passed)) {
      console.log(`  - ${r.name}${r.detail ? ': ' + r.detail : ''}`);
    }
  }
  console.log('='.repeat(60));
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
