// Atlas — Unit tests for js/timing.js
// Tests wait(), waitOrHidden(), and AbortController loop lifecycle patterns.
// No DOM dependency — waitOrHidden receives a mock document via the doc parameter.

import { wait, waitOrHidden } from '../js/timing.js';

// ---- Minimal test harness ----
let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    const result = fn();
    if (result && typeof result.then === 'function') {
      return result.then(
        () => { passed++; console.log(`  ✓ ${name}`); },
        (err) => { failed++; failures.push({ name, err: err.message }); console.log(`  ✗ ${name} — ${err.message}`); },
      );
    }
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    failures.push({ name, err: err.message });
    console.log(`  ✗ ${name} — ${err.message}`);
  }
}

const assert = {
  equal(a, b, msg) { if (a !== b) throw new Error(msg || `expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); },
  ok(val, msg) { if (!val) throw new Error(msg || `expected truthy, got ${JSON.stringify(val)}`); },
  throws(fn, msg) { try { fn(); throw new Error(msg || 'expected error, none thrown'); } catch (e) { if (e.message === (msg || 'expected error, none thrown')) throw e; } },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- Mock document for waitOrHidden ----
function mockDoc(hidden = false) {
  const listeners = {};
  return {
    hidden,
    addEventListener(event, fn, opts) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push({ fn, opts });
    },
    // Test helper: fire event and optionally change hidden state
    fire(event, newHidden) {
      if (newHidden !== undefined) this.hidden = newHidden;
      const list = listeners[event] || [];
      for (const { fn } of list) fn();
      // Clean up once: true listeners
      listeners[event] = list.filter((l) => !l.opts?.once);
    },
  };
}

// ========================================
// Tests
// ========================================
async function run() {
  console.log('\n=== wait() tests ===');

  await test('resolves after timeout', async () => {
    const start = Date.now();
    await wait(50);
    const elapsed = Date.now() - start;
    assert.ok(elapsed >= 40, `elapsed ${elapsed}ms, expected >= 40`);
  });

  await test('resolves immediately if signal already aborted', async () => {
    const ac = new AbortController();
    ac.abort();
    const start = Date.now();
    await wait(5000, ac.signal);
    const elapsed = Date.now() - start;
    assert.ok(elapsed < 100, `elapsed ${elapsed}ms, expected < 100`);
  });

  await test('resolves early when signal aborted during wait', async () => {
    const ac = new AbortController();
    const p = wait(5000, ac.signal);
    await sleep(20);
    ac.abort();
    const start = Date.now();
    await p;
    const elapsed = Date.now() - start;
    assert.ok(elapsed < 100, `elapsed ${elapsed}ms, expected < 100`);
  });

  await test('resolves with no value', async () => {
    const ac = new AbortController();
    const val = await wait(10, ac.signal);
    assert.equal(val, undefined);
  });

  await test('no signal: waits full duration', async () => {
    const start = Date.now();
    await wait(60);
    const elapsed = Date.now() - start;
    assert.ok(elapsed >= 50, `elapsed ${elapsed}ms, expected >= 50`);
  });

  console.log('\n=== waitOrHidden() tests ===');

  await test('resolves false after timeout (no visibility change)', async () => {
    const doc = mockDoc(false);
    const start = Date.now();
    const result = await waitOrHidden(50, undefined, doc);
    const elapsed = Date.now() - start;
    assert.equal(result, false);
    assert.ok(elapsed >= 40, `elapsed ${elapsed}ms, expected >= 40`);
  });

  await test('resolves false if signal already aborted', async () => {
    const doc = mockDoc(false);
    const ac = new AbortController();
    ac.abort();
    const start = Date.now();
    const result = await waitOrHidden(5000, ac.signal, doc);
    const elapsed = Date.now() - start;
    assert.equal(result, false);
    assert.ok(elapsed < 50, `elapsed ${elapsed}ms, expected < 50`);
  });

  await test('resolves false on signal abort during wait', async () => {
    const doc = mockDoc(false);
    const ac = new AbortController();
    const p = waitOrHidden(5000, ac.signal, doc);
    await sleep(10);
    ac.abort();
    const result = await p;
    assert.equal(result, false);
  });

  await test('resolves true when document becomes hidden', async () => {
    const doc = mockDoc(false);
    const p = waitOrHidden(5000, undefined, doc);
    await sleep(10);
    doc.fire('visibilitychange', true);
    const result = await p;
    assert.equal(result, true);
  });

  await test('does not resolve true if document.hidden is still false on event', async () => {
    const doc = mockDoc(false);
    const p = waitOrHidden(5000, undefined, doc);
    await sleep(10);
    // Fire event but don't set hidden to true
    doc.fire('visibilitychange', false);
    // Should still be pending — wait for timeout
    const result = await p;
    assert.equal(result, false);
  });

  await test('cleans up timeout when resolved by visibility', async () => {
    const doc = mockDoc(false);
    const p = waitOrHidden(5000, undefined, doc);
    await sleep(10);
    doc.fire('visibilitychange', true);
    await p;
    // If cleanup failed, the pending setTimeout would fire later — no crash means OK
  });

  await test('signal abort resolves false even if document would become hidden', async () => {
    const doc = mockDoc(false);
    const ac = new AbortController();
    const p = waitOrHidden(5000, ac.signal, doc);
    await sleep(10);
    // Abort first
    ac.abort();
    const result = await p;
    assert.equal(result, false);
    // Now try to fire visibility — should be no-op (already resolved)
    doc.fire('visibilitychange', true);
    // p is already resolved, no error
    await p;
  });

  console.log('\n=== AbortController loop lifecycle tests ===');

  await test('abort cancels in-flight wait', async () => {
    const ac = new AbortController();
    let resolved = false;
    const p = wait(5000, ac.signal).then(() => { resolved = true; });
    await sleep(10);
    assert.equal(resolved, false, 'should not be resolved yet');
    ac.abort();
    await p;
    assert.equal(resolved, true, 'should be resolved after abort');
  });

  await test('double abort is safe', async () => {
    const ac = new AbortController();
    ac.abort();
    ac.abort(); // should not throw
    const result = await wait(100, ac.signal);
    assert.equal(result, undefined);
  });

  await test('loop guard: prevents duplicate entry', async () => {
    let loopRunning = false;
    let loopCount = 0;

    async function runLoop() {
      if (loopRunning) return;
      loopRunning = true;
      try {
        loopCount++;
        await wait(30);
      } finally {
        loopRunning = false;
      }
    }

    // Start two concurrent calls
    await Promise.all([runLoop(), runLoop()]);
    assert.equal(loopCount, 1, `loop ran ${loopCount} times, expected 1`);
  });

  await test('loop resumes after previous iteration finishes', async () => {
    let loopRunning = false;
    let loopCount = 0;

    async function runLoop() {
      if (loopRunning) return;
      loopRunning = true;
      try {
        loopCount++;
        await wait(20);
      } finally {
        loopRunning = false;
      }
    }

    await runLoop();
    assert.equal(loopCount, 1);
    await runLoop();
    assert.equal(loopCount, 2, 'second call should run after first completes');
  });

  await test('abort during loop breaks the cycle', async () => {
    const ac = new AbortController();
    let loopRunning = false;
    let iterations = 0;
    const signal = ac.signal;

    async function runLoop() {
      if (loopRunning) return;
      loopRunning = true;
      try {
        for (;;) {
          if (signal.aborted) break;
          iterations++;
          await wait(20, signal);
          if (signal.aborted) break;
        }
      } finally {
        loopRunning = false;
      }
    }

    const p = runLoop();
    await sleep(50); // let a few iterations run
    ac.abort();
    await p;
    assert.ok(iterations >= 1, `at least 1 iteration, got ${iterations}`);
    assert.equal(loopRunning, false, 'loop should be stopped');
  });

  await test('hidden check at loop top prevents work when hidden', async () => {
    const doc = mockDoc(true); // start hidden
    let iterations = 0;

    // Simulate the loop's top-of-loop hidden check
    async function loopBody() {
      if (doc.hidden) return; // skip work
      iterations++;
    }

    await loopBody();
    assert.equal(iterations, 0, 'should not run when hidden');

    doc.hidden = false;
    await loopBody();
    assert.equal(iterations, 1, 'should run when visible');
  });

  await test('waitOrHidden breaks loop on hidden, loop resumes on visible', async () => {
    const doc = mockDoc(false);
    const ac = new AbortController();
    const signal = ac.signal;
    let phase = 'idle';
    let hiddenDuringWait = false;

    async function runCycle() {
      phase = 'typing';
      await wait(30, signal);
      if (signal.aborted) return;
      phase = 'waiting';
      hiddenDuringWait = await waitOrHidden(5000, signal, doc);
      phase = 'done';
    }

    const p = runCycle();
    await sleep(10); // let typing start
    assert.equal(phase, 'typing');

    // Simulate tab hidden during waitOrHidden
    await sleep(35); // past the wait(30), should be in waitOrHidden now
    doc.fire('visibilitychange', true);
    await p;

    assert.equal(hiddenDuringWait, true, 'waitOrHidden should return true for hidden');
    assert.equal(phase, 'done');
  });

  // ========================================
  // Summary
  // ========================================
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  if (failed > 0) {
    console.log('\nFailures:');
    for (const f of failures) {
      console.log(`  - ${f.name}: ${f.err}`);
    }
  }
  console.log('='.repeat(60));
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
