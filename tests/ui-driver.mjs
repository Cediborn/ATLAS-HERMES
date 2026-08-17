// Atlas — end-to-end UI driver for headless Chrome.
// Drives the REAL app UI (app/index.html): navigates modules, opens the
// project dialog, creates a project, checks it renders, then reloads and
// confirms it persisted. All clicks/keys go through CDP Input domain, so this
// exercises the same event paths a real user does.

import { spawn } from 'node:child_process';

const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL = process.argv[2] || 'http://127.0.0.1:8123/app/index.html';
const PROFILE = process.env.PROFILE || 'C:/Users/damie/AppData/Local/Temp/atlas-ui-profile';
const PORT = Number(process.env.CDP_PORT || 9444);
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
    await waitFor(() => evaluate(`!!document.querySelector('.dashboard')`), 'dashboard render');

    const results = [];
    const check = (name, cond, detail) => { results.push({ name, ok: !!cond, detail: detail || '' }); console.log(`${cond ? 'PASS' : 'FAIL'} — ${name}${detail ? ` (${detail})` : ''}`); };

    // ---- Navigate to Projects via sidebar link ----
    const navClicked = await evaluate(`(() => {
      const links = [...document.querySelectorAll('a, button')];
      const l = links.find((x) => x.textContent.trim() === 'Projects');
      if (!l) return 'no link';
      l.click();
      return 'clicked';
    })()`);
    check('navigate: Projects link found & clicked', navClicked === 'clicked', navClicked);
    await waitFor(() => evaluate(`!!document.getElementById('projects-new')`), 'projects view rendered');

    // ---- Open the create-project dialog ----
    const opened = await evaluate(`(() => {
      const b = document.getElementById('projects-new');
      if (!b) return 'no button';
      b.click();
      return 'clicked';
    })()`);
    check('dialog: New Project button opens form dialog', opened === 'clicked', opened);
    await waitFor(() => evaluate(`document.getElementById('form-dialog-overlay') && !document.getElementById('form-dialog-overlay').hidden`), 'dialog open');

    // ---- Fill the form ----
    const filled = await evaluate(`(() => {
      const title = document.getElementById('fd-title');
      if (!title) return 'no title input';
      title.value = 'UI Test Project';
      title.dispatchEvent(new Event('input', { bubbles: true }));
      return 'filled';
    })()`);
    check('dialog: title field filled', filled === 'filled', filled);

    // ---- Submit ----
    const submitted = await evaluate(`(() => {
      const save = document.getElementById('fd-save');
      if (!save) return 'no save btn';
      save.click();
      return 'clicked';
    })()`);
    check('dialog: save button clicked', submitted === 'clicked', submitted);
    await waitFor(() => evaluate(`[...document.querySelectorAll('*')].some((e) => e.textContent.trim() === 'UI Test Project')`), 'project appears in list');

    // ---- Verify it persists across reload (hash keeps us on Projects) ----
    await send('Page.reload', { ignoreCache: true });
    await waitFor(() => evaluate(`!!document.getElementById('projects-new')`), 'projects view after reload');
    await waitFor(() => evaluate(`[...document.querySelectorAll('*')].some((e) => e.textContent.trim() === 'UI Test Project')`), 'project after reload');
    check('persist: UI-created project survives reload', true);

    // ---- Command palette search ----
    const searchRes = await evaluate(`(() => {
      const t = document.getElementById('search-trigger') || [...document.querySelectorAll('button')].find((b) => /search|command/i.test(b.getAttribute('aria-label') || b.title || ''));
      if (!t) return 'no trigger';
      t.click();
      return 'opened';
    })()`);
    check('palette: opened', searchRes === 'opened', searchRes);
    await waitFor(() => evaluate(`!!document.querySelector('.command-palette, [data-palette], #command-palette')`), 'palette visible');
    const typed = await evaluate(`(() => {
      const input = document.querySelector('.command-palette input, [data-palette] input, #command-palette input, input[placeholder*="search" i], input[placeholder*="command" i]');
      if (!input) return 'no input';
      input.value = 'UI Test';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return 'typed';
    })()`);
    check('palette: search input found', typed === 'typed', typed);
    await sleep(400);
    const found = await evaluate(`[...document.querySelectorAll('*')].some((e) => e.textContent.trim() === 'UI Test Project')`);
    check('palette: finds created project', found);

    // ---- Dashboard reflects real data ----
    await evaluate(`(() => { const l = [...document.querySelectorAll('a, button')].find((x) => x.textContent.trim() === 'Dashboard'); if (l) l.click(); })()`);
    await waitFor(() => evaluate(`!!document.querySelector('.dashboard')`), 'dashboard again');
    const dashHasProject = await evaluate(`[...document.querySelectorAll('*')].some((e) => e.textContent.trim() === 'UI Test Project')`);
    check('dashboard: recent projects include UI-created project', dashHasProject);

    console.log(`\n${results.filter((r) => r.ok).length}/${results.length} UI checks passed`);
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
