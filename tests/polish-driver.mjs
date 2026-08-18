// Atlas — polish feature driver (headless Chrome, no dependencies).
// Verifies the feature-polish work against the real app:
//   1. welcome banner shows on first run and dismisses permanently
//   2. PWA manifest is linked and served
//   3. service worker registers, takes control, and serves the app offline
//   4. Settings has the browser-notification toggle and demo-data button
//   5. "Load demo data" restores seed records (delete one, click, it's back)
// Offline is simulated through CDP Network.emulateNetworkConditions.

import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';

const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL = process.argv[2] || 'http://127.0.0.1:8123/app/index.html';
const PROFILE = process.env.PROFILE || '/tmp/atlas-polish-profile';
const PORT = Number(process.env.CDP_PORT || 9555);

// Fresh profile every run — the welcome-banner check needs first-run state,
// and a reused profile can restore stale tabs from a killed session.
rmSync(PROFILE, { recursive: true, force: true });
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS || 45000);

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

const idbCount = (store) => evaluate(`(async () => {
  const db = await new Promise((res, rej) => { const q = indexedDB.open('atlas-db', 1); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
  return new Promise((res, rej) => { const tx = db.transaction('${store}', 'readonly'); const c = tx.objectStore('${store}').count(); c.onsuccess = () => res(c.result); c.onerror = () => rej(c.error); });
})()`);

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
    await send('Network.enable');
    await send('Page.navigate', { url: URL });
    await waitFor(() => evaluate(`!!document.querySelector('.dashboard')`), 'dashboard render');

    // ---- 1. Welcome banner ----
    const banner = await evaluate(`!!document.querySelector('.welcome-banner')`);
    check('welcome: banner visible on first run', banner);
    await evaluate(`document.getElementById('welcome-dismiss')?.click()`);
    await sleep(300);
    const bannerGone = await evaluate(`!document.querySelector('.welcome-banner')`);
    check('welcome: dismiss removes banner', bannerGone);
    await send('Page.reload', { ignoreCache: true });
    await waitFor(() => evaluate(`!!document.querySelector('.dashboard')`), 'dashboard after reload');
    const bannerStillGone = await evaluate(`!document.querySelector('.welcome-banner')`);
    check('welcome: stays dismissed after reload', bannerStillGone);

    // ---- 2. Manifest ----
    const manifestLinked = await evaluate(`!!document.querySelector('link[rel="manifest"]')`);
    const manifestStatus = await evaluate(`fetch('./manifest.webmanifest').then((r) => r.status).catch(() => 0)`);
    check('pwa: manifest linked and served', manifestLinked && manifestStatus === 200, `status ${manifestStatus}`);

    // ---- 3. Service worker + offline ----
    const swReady = await evaluate(`navigator.serviceWorker.ready.then(() => true).catch(() => false)`);
    check('pwa: service worker registers', swReady);
    // Control is established asynchronously (skipWaiting + clients.claim); the
    // offline reload below is the authoritative proof that the SW serves the app.
    // (Use location.reload() — CDP Page.reload has a quirk where the reloaded
    // document reports a null controller even though fetches are intercepted.)
    await evaluate(`location.reload()`);
    await waitFor(() => evaluate(`!!document.querySelector('.dashboard')`), 'dashboard after SW reload');
    await waitFor(() => evaluate(`!!navigator.serviceWorker.controller`), 'service worker to control page', 10000);
    check('pwa: service worker controls page', true);

    await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
    await send('Page.reload', { ignoreCache: true });
    await waitFor(() => evaluate(`!!document.querySelector('.dashboard')`), 'dashboard offline');
    const offlineOk = await evaluate(`!!document.querySelector('.dashboard') && !!document.querySelector('#sidebar-nav')`);
    check('pwa: app renders fully offline (from cache)', offlineOk);
    await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });

    // ---- 4. Settings UI ----
    await evaluate(`(location.hash = '#/settings')`);
    await waitFor(() => evaluate(`!!document.getElementById('settings-save-profile')`), 'settings render');
    const notifOn = await evaluate(`!!document.getElementById('settings-notif-on')`);
    const notifOff = await evaluate(`!!document.getElementById('settings-notif-off')`);
    const loadDemo = await evaluate(`!!document.getElementById('settings-load-demo')`);
    check('settings: notification toggle present', notifOn && notifOff);
    check('settings: load demo data button present', loadDemo);
    await evaluate(`document.getElementById('settings-notif-on')?.click()`);
    await sleep(300);
    const notifStatus = await evaluate(`document.getElementById('settings-notif-status')?.textContent || ''`);
    check('settings: notification toggle clickable (no throw)', notifStatus.length > 0, notifStatus);

    // ---- 5. Load demo data restores seed records ----
    const before = await idbCount('projects');
    await evaluate(`(async () => { const db = await new Promise((res, rej) => { const q = indexedDB.open('atlas-db', 1); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); await new Promise((res, rej) => { const tx = db.transaction('projects', 'readwrite'); tx.objectStore('projects').delete('p1'); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); })()`);
    const afterDelete = await idbCount('projects');
    check('demo: removed one seed project via IDB', afterDelete === before - 1, `${before} → ${afterDelete}`);
    await evaluate(`document.getElementById('settings-load-demo')?.click()`);
    await sleep(800);
    const afterLoad = await idbCount('projects');
    check('demo: Load demo data restores seed records', afterLoad === before, `${afterDelete} → ${afterLoad}`);

    console.log(`\n${results.filter((r) => r.ok).length}/${results.length} polish checks passed`);
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
