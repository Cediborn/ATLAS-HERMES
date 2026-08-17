// Atlas — minimal CDP driver for headless-Chrome verification.
// Uses only Node built-ins (WebSocket + fetch, no dependencies). Launches
// Chrome with a remote debugging port, navigates to a URL, polls the DOM for
// a completion marker, then prints the result. This is more reliable than
// `chrome --dump-dom` for pages that do real async IndexedDB work.

import { spawn } from 'node:child_process';

const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL = process.argv[2];
const PROFILE = process.env.PROFILE || '/tmp/atlas-chrome-profile';
const PORT = Number(process.env.CDP_PORT || 9333);
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS || 30000);
const WAIT_SELECTOR = process.env.WAIT_SELECTOR || "document.getElementById('results')?.dataset.total || ''";
const OUTPUT_SELECTOR = process.env.OUTPUT_SELECTOR || "document.getElementById('results')?.innerText || ''";

if (!URL) {
  console.error('usage: node cdp-driver.mjs <url>');
  process.exit(2);
}

const chrome = spawn(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  `--user-data-dir=${PROFILE}`,
  `--remote-debugging-port=${PORT}`,
  'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(cond, what) {
  const start = Date.now();
  while (Date.now() - start < TIMEOUT_MS) {
    if (await cond()) return;
    await sleep(250);
  }
  throw new Error(`Timed out waiting for ${what}`);
}

async function main() {
  try {
    await waitFor(async () => {
      try {
        const r = await fetch(`http://127.0.0.1:${PORT}/json/list`);
        const list = await r.json();
        return list.some((t) => t.type === 'page');
      } catch {
        return false;
      }
    }, 'devtools endpoint');

    const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    const page = list.find((t) => t.type === 'page');
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    let nextId = 0;
    const pending = new Map();
    let exceptions = [];

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

    await send('Runtime.enable');
    await send('Page.enable');
    await send('Page.navigate', { url: URL });
    await waitFor(async () => {
      const r = await send('Runtime.evaluate', {
        expression: WAIT_SELECTOR,
        returnByValue: true,
      });
      return Boolean(r.result?.result?.value);
    }, WAIT_SELECTOR);

    const out = await send('Runtime.evaluate', {
      expression: OUTPUT_SELECTOR,
      returnByValue: true,
    });
    console.log(out.result?.result?.value || '(no output)');
    if (exceptions.length) {
      console.error('PAGE EXCEPTIONS:');
      for (const e of exceptions.slice(0, 10)) console.error(e.split('\n').slice(0, 6).join('\n'));
    }
    ws.close();
  } finally {
    chrome.kill();
  }
}

main().catch((err) => {
  console.error('DRIVER ERROR:', err.message);
  chrome.kill();
  process.exit(1);
});
