// Atlas — LUNA collapse + landing page driver (headless Chrome, no deps).
// App side: FAB collapse button shrinks LUNA to a dot, state persists across
// reload, compact FAB expands it back, and the panel has a minimize button.
// Landing side: hero badges, 12 capability cards, working palette demo loop.

import { spawn } from 'node:child_process';

const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const APP_URL = process.argv[2] || 'http://127.0.0.1:8123/app/index.html';
const LANDING_URL = process.argv[3] || 'http://127.0.0.1:8123/index.html';
const PROFILE = process.env.PROFILE || 'C:/Users/damie/AppData/Local/Temp/atlas-luna-landing';
const PORT = Number(process.env.CDP_PORT || 9777);
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS || 40000);

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
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
  if (r.result?.exceptionDetails) throw new Error('evaluate threw: ' + (r.result.exceptionDetails.exception?.description || ''));
  return r.result?.result?.value;
};

async function main() {
  const results = [];
  const check = (name, cond, detail = '') => {
    results.push({ name, ok: !!cond });
    console.log(`${cond ? 'PASS' : 'FAIL'} — ${name}${detail ? ` (${detail})` : ''}`);
  };

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

    // ================= LUNA =================
    await send('Page.navigate', { url: APP_URL });
    await waitFor(() => evaluate(`!!document.querySelector('.dashboard')`), 'dashboard render');
    await waitFor(() => evaluate(`!!document.getElementById('luna-fab')`), 'luna fab');

    check('luna: FAB visible with collapse control', await evaluate(`!!document.getElementById('luna-collapse')`));
    check('luna: panel has minimize button', await evaluate(`!!document.getElementById('luna-min')`));

    // Collapse via the FAB notch → compact dot.
    await evaluate(`document.getElementById('luna-collapse').click()`);
    await sleep(200);
    check('luna: collapse shrinks to dot', await evaluate(`document.getElementById('luna-fab-wrap').classList.contains('is-collapsed') && getComputedStyle(document.querySelector('.luna-fab__label')).display === 'none'`));
    check('luna: collapsed state persisted', await evaluate(`localStorage.getItem('atlas:lunaCollapsed') === '1'`));

    // Reload → still collapsed.
    await send('Page.reload', { ignoreCache: true });
    await waitFor(() => evaluate(`!!document.getElementById('luna-fab')`), 'luna fab after reload');
    await waitFor(() => evaluate(`document.getElementById('luna-fab-wrap').classList.contains('is-collapsed')`), 'collapsed after reload');
    check('luna: stays collapsed after reload', true);

    // Click the compact FAB → expands back.
    await evaluate(`document.getElementById('luna-fab').click()`);
    await sleep(200);
    check('luna: compact FAB expands back', await evaluate(`!document.getElementById('luna-fab-wrap').classList.contains('is-collapsed') && document.getElementById('luna-fab').getAttribute('aria-label') === 'Ask LUNA'`));

    // Open the panel, then minimize from within → collapses again.
    await evaluate(`document.getElementById('luna-fab').click()`);
    await waitFor(() => evaluate(`!document.getElementById('luna-panel').hidden`), 'panel open');
    check('luna: FAB opens panel', true);
    await evaluate(`document.getElementById('luna-min').click()`);
    await sleep(200);
    check('luna: minimize from panel collapses', await evaluate(`document.getElementById('luna-fab-wrap').classList.contains('is-collapsed') && document.getElementById('luna-panel').hidden`));

    // Restore for cleanliness.
    await evaluate(`document.getElementById('luna-fab').click()`);
    await sleep(100);

    // ================= LANDING =================
    await send('Page.navigate', { url: LANDING_URL });
    await waitFor(() => evaluate(`!!document.querySelector('#pillars-grid .pillar-card')`), 'pillars render');

    check('landing: hero badges present', await evaluate(`document.querySelectorAll('.hero__badge').length === 4`));
    const pillarCount = await evaluate(`document.querySelectorAll('#pillars-grid .pillar-card').length`);
    check('landing: twelve capability cards', pillarCount === 12, `${pillarCount}`);
    check('landing: LUNA card present', await evaluate(`[...document.querySelectorAll('.pillar-card h3')].some((h) => h.textContent === 'LUNA')`));
    check('landing: philosophy reflects persistence', await evaluate(`[...document.querySelectorAll('#philosophy h3')].some((h) => /persistent/i.test(h.textContent))`));
    await sleep(1200);
    const typed = await evaluate(`document.getElementById('palette-typed')?.textContent || ''`);
    check('landing: palette demo types', typed.length > 0, JSON.stringify(typed.slice(0, 20)));
    const resultVisible = await evaluate(`document.getElementById('palette-result').classList.contains('is-visible')`);
    check('landing: palette demo result shows', resultVisible);

    console.log(`\n${results.filter((r) => r.ok).length}/${results.length} checks passed`);
    if (exceptions.length) {
      console.error('\nPAGE EXCEPTIONS:');
      for (const e of exceptions.slice(0, 10)) console.error(e.split('\n').slice(0, 6).join('\n'));
      process.exitCode = 1;
    } else {
      console.log('No page exceptions.');
    }
  } finally {
    ws?.close();
    chrome.kill();
  }
}

main().catch((err) => { console.error('DRIVER ERROR:', err.message); chrome.kill(); process.exit(1); });
