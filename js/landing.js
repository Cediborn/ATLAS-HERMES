// Atlas — Landing page script. Self-contained: doesn't touch the app shell modules.

import { icon } from './icons.js';
import { pillars, heroDemos } from './mock-data.js';
import { initTheme } from './theme.js';

initTheme();

const philosophy = [
  { icon: 'check', title: 'Local-first & persistent', desc: 'Every project, note, habit, and transaction lives in your browser (IndexedDB). Refresh, restart, or go offline \u2014 it\u2019s all still there.' },
  { icon: 'layers', title: 'Workspaces, not folders', desc: 'Personal, University, and Startup are real data scopes \u2014 switch contexts and the whole system follows.' },
  { icon: 'search', title: 'One search, everything', desc: 'The command palette finds projects, tasks, notes, events, goals, and books \u2014 then takes you straight to the item.' },
  { icon: 'sparkle', title: 'LUNA, your local AI', desc: 'Ask LUNA about your day in plain language. It reads your live data on-device \u2014 nothing leaves your machine.' },
];

document.getElementById('philosophy').innerHTML = philosophy
  .map(
    (p) => `
    <div class="philosophy__item">
      <span>${icon(p.icon, { size: 18 })}</span>
      <h3>${p.title}</h3>
      <p>${p.desc}</p>
    </div>`
  )
  .join('');

document.getElementById('pillars-grid').innerHTML = pillars
  .map(
    (p) => `
    <div class="pillar-card">
      <span class="pillar-card__icon">${icon(p.icon, { size: 20 })}</span>
      <h3>${p.title}</h3>
      <p>${p.desc}</p>
    </div>`
  )
  .join('');

// ---- Hero command-palette demo: shows the "ambient AI" pillar instead of describing it ----
const typedEl = document.getElementById('palette-typed');
const resultEl = document.getElementById('palette-result');
const resultIconEl = document.getElementById('palette-result-icon');
const resultTitleEl = document.getElementById('palette-result-title');
const resultTimeEl = document.getElementById('palette-result-time');
const resultTagEl = document.getElementById('palette-result-tag');

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function typeText(text) {
  typedEl.textContent = '';
  for (const char of text) {
    typedEl.textContent += char;
    await wait(35);
  }
}

function showResult(demo) {
  resultIconEl.innerHTML = icon(demo.icon, { size: 18 });
  resultTitleEl.textContent = demo.resultTitle;
  resultTimeEl.textContent = demo.time;
  resultTagEl.textContent = demo.tag;
}

async function runDemoLoop() {
  if (reduceMotion) {
    typedEl.textContent = heroDemos[0].typed;
    showResult(heroDemos[0]);
    resultEl.classList.add('is-visible');
    return;
  }

  let i = 0;
  for (;;) {
    const demo = heroDemos[i % heroDemos.length];
    resultEl.classList.remove('is-visible');
    showResult(demo);
    await typeText(demo.typed);
    await wait(350);
    resultEl.classList.add('is-visible');
    await wait(2400);
    await wait(400);
    i += 1;
  }
}

runDemoLoop();
