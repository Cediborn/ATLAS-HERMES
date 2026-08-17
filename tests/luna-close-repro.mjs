// Atlas — LUNA close repro: drives the panel with REAL mouse clicks (CDP
// Input domain) and checks computed display, because synthetic element.click()
// fires even when CSS keeps the panel visible.

import { spawn } from 'node:child_process';

const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL = process.argv[2] || 'http://127.0.0.1:8123/app/index.html';
const PROFILE = process.env.PROFILE || 'C:/Users/damie/AppData/Local/Temp/atlas-close-repro';
const PORT = Number(process.env.CDP_PORT || 9888);
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS || 40000);

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--window-size=1280,900',
  `--user-data-dir=${PROFILE}`, `--remote-debugging-port=${PORT}`, 'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(cond, what, timeout = TIMEOUT_MS) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await cond()) return;
    await sleep(200);
  }
  throw new Error(`Timed out waiting for ${what}`);
}

let ws, nextId = 0, pending = new Map(), exceptions = [];
const send = (method, params = {}) => new Promise((resolve) => {
  const id = ++nextId;
  pending.set(id, resolve);
  ws.send(JSON.stringify({ id, method, params }));
});
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  return r.result?.result?.value;
};

// Real mouse click at the center of a selector.
async function realClick(selector) {
  const r = await evaluate(`(() => {
    const el = document.querySelector('${selector}');
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, hidden: el.hidden };
  })()`);
  if (!r) throw new Error(`no element for ${selector}`);
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: r.x, y: r.y });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', clickCount: 1 });
  return r;
}

const panelState = () => evaluate(`(() => {
  const p = document.getElementById('luna-panel');
  return { hiddenAttr: p.hidden, display: getComputedStyle(p).display, visible: p.getBoundingClientRect().height > 0 };
})()`);

async function main() {
  try {
    await waitFor(async () => {
      try { return (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).some((t) => t.type === 'page'); }
      catch { return false; }
    }, 'devtools endpoint');
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
      if (msg.method === 'Runtime.exceptionThrown') {
        exceptions.push(msg.params.exceptionDetails?.exception?.description || msg.params.exceptionDetails?.text || 'unknown');
      }
    });
    await send('Runtime.enable');
    await send('Page.enable');
    await send('Page.navigate', { url: URL });
    await waitFor(() => evaluate(`!!document.querySelector('.dashboard')`), 'dashboard');
    await waitFor(() => evaluate(`!!document.getElementById('luna-fab')`), 'luna fab');

    console.log('state on load:', JSON.stringify(await panelState()));

    // Real click the FAB → should OPEN the panel.
    await realClick('#luna-fab');
    await sleep(300);
    console.log('after FAB click:', JSON.stringify(await panelState()));

    // Real click the X close button → should CLOSE (hidden + display none).
    await realClick('#luna-close');
    await sleep(300);
    console.log('after X click:', JSON.stringify(await panelState()));

    const state = await panelState();
    const closedOk = state.hiddenAttr === true && state.display === 'none';
    console.log(closedOk ? '\nPASS — panel truly closes (hidden + display:none)' : '\nFAIL — panel still visible (BUG REPRODUCED)');
    if (exceptions.length) { console.error('PAGE EXCEPTIONS:'); for (const e of exceptions.slice(0, 5)) console.error(e); }
  } finally {
    ws?.close();
    chrome.kill();
  }
}

main().catch((err) => { console.error('DRIVER ERROR:', err.message); chrome.kill(); process.exit(1); });
