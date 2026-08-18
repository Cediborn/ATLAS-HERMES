// Atlas — Automated test runner for security, persistence, and offline tests.
// Run with: node tests/test-runner.mjs
// Uses a lightweight assertion library (no external dependencies).

import { esc, escAttr, escJs } from '../js/sanitize.js';
import { renderMarkdown } from '../js/notes/markdown.js';

// ---- Minimal test harness ----
let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  PASS: ${name}`);
  } catch (err) {
    failed++;
    failures.push({ name, err });
    console.error(`  FAIL: ${name} — ${err.message}`);
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

function assertIncludes(haystack, needle, msg) {
  if (!haystack.includes(needle)) throw new Error(msg || `Expected to include "${needle}" in "${haystack.slice(0, 200)}"`);
}

function assertNotIncludes(haystack, needle, msg) {
  if (haystack.includes(needle)) throw new Error(msg || `Expected NOT to include "${needle}" in "${haystack.slice(0, 200)}"`);
}

// ================================================================
// 1. XSS Regression Tests — esc()
// ================================================================
console.log('\n=== XSS Regression Tests (esc) ===');

test('esc: escapes ampersands', () => {
  assert(esc('a&b') === 'a&amp;b');
});

test('esc: escapes less-than', () => {
  assert(esc('a<b') === 'a&lt;b');
});

test('esc: escapes greater-than', () => {
  assert(esc('a>b') === 'a&gt;b');
});

test('esc: escapes double quotes', () => {
  assert(esc('a"b') === 'a&quot;b');
});

test('esc: escapes single quotes', () => {
  assert(esc("a'b") === 'a&#39;b');
});

test('esc: handles null/undefined', () => {
  assert(esc(null) === '');
  assert(esc(undefined) === '');
});

test('esc: handles numbers', () => {
  assert(esc(42) === '42');
});

test('esc: blocks script injection', () => {
  const input = '<script>alert("xss")</script>';
  const out = esc(input);
  // The key check: < and > must be escaped so the browser can't parse a tag
  assertNotIncludes(out, '<script>');
  assert(out.includes('&lt;script&gt;'), 'Angle brackets should be entity-escaped');
});

test('esc: blocks img onerror injection', () => {
  const input = '<img src=x onerror=alert(1)>';
  const out = esc(input);
  assertNotIncludes(out, '<img');
  // Once escaped, the attribute value context is destroyed — browser sees text, not a tag
  assert(out.includes('&lt;img'), 'img tag should be escaped');
});

test('esc: blocks event handler injection', () => {
  const input = '" onclick="alert(1)"';
  const out = esc(input);
  // Quotes escaped, so the browser can't break out of an attribute
  assert(out.includes('&quot;'), 'Double quotes should be entity-escaped');
});

test('esc: blocks SVG onload injection', () => {
  const input = '<svg onload=alert(1)>';
  const out = esc(input);
  assertNotIncludes(out, '<svg');
  assert(out.includes('&lt;svg'), 'SVG tag should be escaped');
});

test('esc: blocks iframe injection', () => {
  const input = '<iframe src="javascript:alert(1)"></iframe>';
  const out = esc(input);
  assertNotIncludes(out, '<iframe');
});

test('esc: blocks style injection', () => {
  const input = '<style>body{background:red}</style>';
  const out = esc(input);
  assertNotIncludes(out, '<style>');
});

// ================================================================
// 2. XSS Regression Tests — escAttr()
// ================================================================
console.log('\n=== XSS Regression Tests (escAttr) ===');

test('escAttr: escapes double quotes for attributes', () => {
  assert(escAttr('a"b') === 'a&quot;b');
});

test('escAttr: escapes single quotes', () => {
  assert(escAttr("a'b") === 'a&#39;b');
});

test('escAttr: escapes backticks', () => {
  assert(escAttr('a`b') === 'a&#96;b');
});

test('escAttr: escapes angle brackets', () => {
  assert(escAttr('<b>') === '&lt;b&gt;');
});

test('escAttr: attribute injection with quote escape', () => {
  const input = '" onmouseover="alert(1)"';
  const out = escAttr(input);
  // All quotes escaped, so browser cannot break out of the attribute
  assert(out.includes('&quot;'), 'Quotes should be escaped');
  assertNotIncludes(out, '" on');
});

test('escAttr: handles null/undefined', () => {
  assert(escAttr(null) === '');
  assert(escAttr(undefined) === '');
});

// ================================================================
// 3. Markdown Link Safety Tests
// ================================================================
console.log('\n=== Markdown Link Safety Tests ===');

test('markdown: allows https links', () => {
  const html = renderMarkdown('[link](https://example.com)');
  assertIncludes(html, 'href="https://example.com"');
  assertIncludes(html, 'target="_blank"');
});

test('markdown: allows http links', () => {
  const html = renderMarkdown('[link](http://example.com)');
  assertIncludes(html, 'href="http://example.com"');
});

test('markdown: allows mailto links', () => {
  const html = renderMarkdown('[email](mailto:test@example.com)');
  assertIncludes(html, 'href="mailto:test@example.com"');
});

test('markdown: blocks javascript: links', () => {
  const html = renderMarkdown('[click](javascript:alert(1))');
  assertNotIncludes(html, 'javascript:');
  // Should render as plain text (just the label)
  assertIncludes(html, 'click');
});

test('markdown: blocks data: links', () => {
  const html = renderMarkdown('[click](data:text/html,<script>alert(1)</script>)');
  assertNotIncludes(html, 'data:');
});

test('markdown: blocks vbscript: links', () => {
  const html = renderMarkdown('[click](vbscript:msgbox(1))');
  assertNotIncludes(html, 'vbscript:');
});

test('markdown: blocks file: links', () => {
  const html = renderMarkdown('[click](file:///etc/passwd)');
  assertNotIncludes(html, 'file:');
});

test('markdown: allows relative links', () => {
  const html = renderMarkdown('[link](./page.html)');
  assertIncludes(html, 'href="./page.html"');
});

test('markdown: allows anchor links', () => {
  const html = renderMarkdown('[link](#section)');
  assertIncludes(html, 'href="#section"');
});

test('markdown: malformed URL renders as text', () => {
  const html = renderMarkdown('[click](not a url at all)');
  // Should still render the label but not create a broken href
  assertIncludes(html, 'click');
});

// ================================================================
// 4. Markdown XSS Prevention Tests
// ================================================================
console.log('\n=== Markdown XSS Prevention Tests ===');

test('markdown: escapes HTML in headings', () => {
  const html = renderMarkdown('# <script>alert(1)</script>');
  assertNotIncludes(html, '<script>');
  assertIncludes(html, '&lt;script&gt;');
});

test('markdown: escapes HTML in bold text', () => {
  const html = renderMarkdown('**<img src=x onerror=alert(1)>**');
  assertNotIncludes(html, '<img');
});

test('markdown: escapes HTML in list items', () => {
  const html = renderMarkdown('- <script>alert(1)</script>');
  assertNotIncludes(html, '<script>');
});

test('markdown: escapes HTML in blockquotes', () => {
  const html = renderMarkdown('> <script>alert(1)</script>');
  assertNotIncludes(html, '<script>');
});

test('markdown: escapes HTML in code blocks', () => {
  const html = renderMarkdown('```\n<script>alert(1)</script>\n```');
  assertNotIncludes(html, '<script>');
});

// ================================================================
// 5. Hostile String Tests for Major Data Types
// ================================================================
console.log('\n=== Hostile String Tests ===');

const HOSTILE_STRINGS = [
  '<script>alert("xss")</script>',
  '"><img src=x onerror=alert(1)>',
  "javascript:alert('xss')",
  '<svg onload=alert(1)>',
  '${7*7}', // template literal injection
  '{{7*7}}', // template injection
  '\\"><script>alert(1)</script>',
  "' OR '1'='1",
  '<iframe src="javascript:alert(1)">',
  '<body onload=alert(1)>',
  '<input onfocus=alert(1) autofocus>',
  '<marquee onstart=alert(1)>',
  'data:text/html,<script>alert(1)</script>',
];

for (const hostile of HOSTILE_STRINGS) {
  test(`esc() neutralizes: ${hostile.slice(0, 40)}...`, () => {
    const out = esc(hostile);
    // Core XSS defense: no unescaped < > " ' in output
    assertNotIncludes(out, '<script');
    assertNotIncludes(out, '<svg');
    assertNotIncludes(out, '<iframe');
    assertNotIncludes(out, '<input');
    assertNotIncludes(out, '<body');
    assertNotIncludes(out, '<marquee');
    // Tag characters must be entity-escaped
    if (hostile.includes('<')) assert(out.includes('&lt;'), `'<' in input must be escaped to &lt;`);
    if (hostile.includes('>')) assert(out.includes('&gt;'), `'>' in input must be escaped to &gt;`);
  });

  test(`escAttr() neutralizes: ${hostile.slice(0, 40)}...`, () => {
    const out = escAttr(hostile);
    assertNotIncludes(out, '<script');
    assertNotIncludes(out, '<svg');
    assertNotIncludes(out, '<iframe');
    // All quotes must be escaped so they can't break attribute context
    if (hostile.includes('"')) assert(out.includes('&quot;'), `'"' in input must be escaped`);
  });
}

// ================================================================
// 6. sanitize.js escJs Tests
// ================================================================
console.log('\n=== escJs Tests ===');

test('escJs: escapes backslashes', () => {
  assert(escJs('a\\b') === 'a\\\\b');
});

test('escJs: escapes single quotes', () => {
  assert(escJs("a'b") === "a\\'b");
});

test('escJs: escapes double quotes', () => {
  assert(escJs('a"b') === 'a\\"b');
});

test('escJs: escapes newlines', () => {
  assert(escJs('a\nb') === 'a\\nb');
});

// ================================================================
// 7. DB removeByWorkspace existence check
// ================================================================
console.log('\n=== DB API Existence Tests ===');

test('db.js exports removeByWorkspace', async () => {
  const db = await import('../js/db.js');
  assert(typeof db.removeByWorkspace === 'function', 'removeByWorkspace should be exported');
});

test('persistence.js exports saveWorkspace-backed functions', async () => {
  const p = await import('../js/persistence.js');
  assert(typeof p.saveProjects === 'function', 'saveProjects should be exported');
  assert(typeof p.saveNotes === 'function', 'saveNotes should be exported');
  assert(typeof p.saveEvents === 'function', 'saveEvents should be exported');
  assert(typeof p.saveHabits === 'function', 'saveHabits should be exported');
  assert(typeof p.saveCompletions === 'function', 'saveCompletions should be exported');
  assert(typeof p.saveGoals === 'function', 'saveGoals should be exported');
  assert(typeof p.saveResources === 'function', 'saveResources should be exported');
  assert(typeof p.saveTransactions === 'function', 'saveTransactions should be exported');
  assert(typeof p.saveBooks === 'function', 'saveBooks should be exported');
  assert(typeof p.saveCodingItems === 'function', 'saveCodingItems should be exported');
  assert(typeof p.saveCodingSessions === 'function', 'saveCodingSessions should be exported');
});

// ================================================================
// Summary
// ================================================================
console.log('\n' + '='.repeat(60));
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failures.length > 0) {
  console.log('\nFailures:');
  for (const f of failures) {
    console.log(`  - ${f.name}: ${f.err.message}`);
  }
}
console.log('='.repeat(60));

// Exit with non-zero code if any tests failed (for CI)
if (typeof process !== 'undefined' && process.exit) {
  process.exit(failed > 0 ? 1 : 0);
}
