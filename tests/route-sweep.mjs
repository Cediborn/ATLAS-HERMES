// Atlas — route sweep: visit every module in the real app, wait for its view
// to render, and report any page exception plus a per-module sanity signal.
import { spawn } from 'node:child_process';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = 'C:/Users/damie/AppData/Local/Temp/atlas-sweep-profile';
const PORT = 9466;

const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', `--user-data-dir=${PROFILE}`, `--remote-debugging-port=${PORT}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  await sleep(3000);
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl);
  let id = 0; const pending = new Map(); const exceptions = [];
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') exceptions.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || 'unknown');
  });
  await new Promise((res) => ws.addEventListener('open', res, { once: true }));
  const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    return r.result?.result?.value;
  };
  const waitFor = async (cond, timeout = 15000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) { if (await cond()) return true; await sleep(200); }
    return false;
  };

  await send('Runtime.enable'); await send('Page.enable');
  await send('Page.navigate', { url: 'http://127.0.0.1:8123/app/index.html' });
  await waitFor(() => ev(`!!document.querySelector('.dashboard')`), 20000);

  // route -> sanity selector (something only that module renders)
  const routes = {
    dashboard: `.dashboard`,
    projects: `#projects-new`,
    calendar: `.calendar-page, .calendar-grid, [class*="calendar-view"]`,
    notes: `.notes-page, .notes-grid, #notes-search`,
    habits: `.habits-page, .habit-card, #habits-search`,
    goals: `#goals-new, .goals-page`,
    learning: `#resources-new, .learning-page`,
    finance: `#transactions-new, .finance-page`,
    books: `#books-new, .books-page`,
    coding: `#coding-new, .coding-page`,
    settings: `.settings-page`,
  };

  let pass = 0, fail = 0;
  for (const [route, selector] of Object.entries(routes)) {
    const before = exceptions.length;
    await ev(`location.hash = '#/${route}'`);
    // Sometimes the router listens for hashchange; if not, force a reload path
    const ok = await waitFor(() => ev(`!!document.querySelector('${selector}')`));
    const newExceptions = exceptions.slice(before);
    if (ok && newExceptions.length === 0) { pass += 1; console.log(`PASS — ${route}`); }
    else { fail += 1; console.log(`FAIL — ${route} rendered=${ok} exceptions=${newExceptions.length}`); for (const e of newExceptions.slice(0, 3)) console.log('   ', e.split('\n').slice(0, 3).join(' ')); }
  }

  console.log(`\n${pass}/${pass + fail} routes rendered clean`);
  if (exceptions.length) { console.log('\nALL EXCEPTIONS:'); for (const e of exceptions.slice(0, 15)) console.log(e.split('\n').slice(0, 4).join('\n'), '\n---'); }
  ws.close(); chrome.kill();
}
main().catch((e) => { console.error('ERR', e.message); chrome.kill(); });
