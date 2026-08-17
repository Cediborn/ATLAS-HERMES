// Atlas — Notes canonical data. Mirrors the Projects module's data.js shape
// (a config object mapping keys to colors/icons, plus a flat array of
// records) since that pattern already works — no reason to invent a new one.

export const CATEGORY_CONFIG = {
  'Lecture Notes': { icon: 'bookOpen', color: 'blue' },
  'Meeting Notes': { icon: 'users', color: 'slate' },
  Brainstorm: { icon: 'lightbulb', color: 'violet' },
  Journal: { icon: 'book', color: 'rose' },
  'Shopping List': { icon: 'checklist', color: 'amber' },
  'Code Snippet': { icon: 'code', color: 'teal' },
};
export const CATEGORIES = Object.keys(CATEGORY_CONFIG);

export let notes = [
  {
    id: 'n1', title: 'Distributed Systems \u2014 Consensus Protocols', category: 'Lecture Notes',
    tags: ['University', 'Research'], createdAt: '2026-03-05', updatedAt: '2026-07-24',
    pinned: false, favorite: false, archived: false,
    content: "# Consensus Protocols\n\n## Why consensus is hard\nNodes can fail, messages can be delayed or lost, and there's no global clock. A consensus protocol needs to reach agreement despite all of that.\n\n## Paxos\n- **Prepare phase**: proposer asks acceptors for a promise\n- **Accept phase**: proposer sends a value, acceptors accept or reject\n- Safety comes from majority quorums overlapping\n\n## Raft (the practical alternative)\nRaft splits the problem into three understandable pieces:\n1. Leader election\n2. Log replication\n3. Safety\n\n> Raft is Paxos, but written for humans to actually implement.\n\n## Benchmark to run before Friday\n`ping-pong latency across 5 regions, 10k requests, p50/p95/p99`\n\nStill need to compare against my thesis chapter's assumptions.",
  },
  {
    id: 'n2', title: 'Organic Chemistry \u2014 Reaction Mechanisms', category: 'Lecture Notes',
    tags: ['University'], createdAt: '2026-02-10', updatedAt: '2026-02-15',
    pinned: false, favorite: false, archived: true,
    content: "# Reaction Mechanisms \u2014 SN1 vs SN2\n\n## SN2\n- One step, backside attack\n- Rate depends on **both** nucleophile and substrate concentration\n- Inversion of stereochemistry (Walden inversion)\n- Favored by primary carbons, strong nucleophiles, polar aprotic solvents\n\n## SN1\n- Two steps: carbocation forms first, then nucleophile attacks\n- Rate depends only on substrate concentration\n- Racemization at the reactive center\n- Favored by tertiary carbons, weak nucleophiles, polar protic solvents\n\n## Midterm will probably ask\nDraw the energy diagram for both and label the transition state(s).",
  },
  {
    id: 'n3', title: 'Art History \u2014 Renaissance Perspective', category: 'Lecture Notes',
    tags: ['University'], createdAt: '2026-07-10', updatedAt: '2026-07-18',
    pinned: false, favorite: false, archived: false,
    content: "# Renaissance Perspective\n\nBrunelleschi's experiments with linear perspective in Florence (early 1400s) gave painters a mathematical system for depth that medieval art never had.\n\n- Vanishing point\n- Horizon line\n- Orthogonal lines converging\n\nMasaccio's *Holy Trinity* fresco is the textbook example \u2014 the architecture reads as a real room extending behind the wall.\n\nCompare with Byzantine icon painting next week: intentional *lack* of depth, flattened space as a theological choice, not a technical limitation.",
  },
  {
    id: 'n4', title: 'Q3 Planning Sync', category: 'Meeting Notes',
    tags: ['Work', 'Startup'], createdAt: '2026-07-22', updatedAt: '2026-07-22',
    pinned: false, favorite: true, archived: false,
    content: "# Q3 Planning Sync\n\n**Attendees:** Sarah, Marcus, me\n\n## Decisions\n- Marketing site ships before the pitch deck, not after\n- Database migration gets one more week of buffer\n- Onboarding flow owns the August 10 deadline, no slipping\n\n## Open questions\n- Do we need a rollback plan for the Postgres migration, or is the feature flag enough?\n- Who's covering Sarah's fundraising prep while she's out next week?\n\n## Action items\n- [ ] Me: finish sidebar collapse animation by Monday\n- [ ] Marcus: confirm migration window with infra\n- [ ] Sarah: send updated deck numbers",
  },
  {
    id: 'n5', title: '1:1 with Sarah', category: 'Meeting Notes',
    tags: ['Work'], createdAt: '2026-07-20', updatedAt: '2026-07-20',
    pinned: false, favorite: false, archived: false,
    content: "# 1:1 with Sarah\n\n- Doing okay, a little stressed about the pitch deck deadline\n- Wants more context before jumping into the fundraising numbers\n- Mentioned she'd like to pair on the onboarding flow next sprint\n\nFollow up: send her the Q3 planning notes.",
  },
  {
    id: 'n6', title: 'Client Kickoff \u2014 Onboarding Flow', category: 'Meeting Notes',
    tags: ['Startup', 'Product'], createdAt: '2026-06-05', updatedAt: '2026-06-05',
    pinned: false, favorite: false, archived: false,
    content: "# Client Kickoff \u2014 Onboarding Flow\n\nFirst call with the new enterprise client. Walked through the current 9-step flow and where it loses people (step 4, verification).\n\n## Their asks\n- SSO support eventually, not urgent\n- Custom branding on the welcome screen\n- Slack notification when a new user completes onboarding\n\n## Next steps\nMarcus to send a scoped proposal by end of week.",
  },
  {
    id: 'n7', title: 'App name ideas', category: 'Brainstorm',
    tags: ['Atlas', 'Ideas'], createdAt: '2026-06-15', updatedAt: '2026-06-20',
    pinned: false, favorite: false, archived: false,
    content: "# App name ideas\n\n- Meridian\n- Waypoint\n- ~~Northstar~~ (taken)\n- Basecamp (taken, obviously)\n- Anchor\n- **Atlas** \u2190 going with this one\n\nAtlas won because it actually means something \u2014 holding everything up, one system carrying the weight of seven apps.",
  },
  {
    id: 'n8', title: 'Weekend trip destinations', category: 'Brainstorm',
    tags: ['Personal'], createdAt: '2026-03-01', updatedAt: '2026-03-02',
    pinned: false, favorite: false, archived: true,
    content: "# Weekend trip destinations\n\nOld list, mostly outdated now:\n- Lake Tahoe (did this already)\n- Portland\n- Asheville\n- Santa Fe\n\nRevisit closer to actually planning something.",
  },
  {
    id: 'n9', title: 'Newsletter topic list', category: 'Brainstorm',
    tags: ['Writing', 'Ideas'], createdAt: '2026-07-15', updatedAt: '2026-07-25',
    pinned: true, favorite: false, archived: false,
    content: "# Newsletter topic list\n\nIdeas for the next few sends:\n\n1. Why we chose hash routing over path routing (the GitHub Pages problem nobody talks about)\n2. Building a component system before you have a framework\n3. What \"premium\" actually means in software, beyond gradients\n4. Interview: how [redacted] structures their design tokens\n\nDraft #1 due the 30th.",
  },
  {
    id: 'n10', title: 'Morning pages \u2014 July 24', category: 'Journal',
    tags: ['Personal'], createdAt: '2026-07-24', updatedAt: '2026-07-24',
    pinned: false, favorite: true, archived: false,
    content: "# Morning pages \u2014 July 24\n\nWoke up early, actually got outside before it got hot. Been thinking about how much calmer the week feels when I write something down first instead of opening a laptop.\n\nThree things I'm carrying today:\n- The thesis chapter isn't going to write itself\n- I keep saying \"after this project\" like there's a finish line\n- That's probably worth sitting with, not fixing",
  },
  {
    id: 'n11', title: 'Reflections after the marathon training run', category: 'Journal',
    tags: ['Personal', 'Health'], createdAt: '2026-07-19', updatedAt: '2026-07-19',
    pinned: false, favorite: false, archived: false,
    content: "# Reflections after the marathon training run\n\n18 miles today, longest one yet. Legs are done but the head is clear in a way it hasn't been all week.\n\nNoticing the training plan finally clicking \u2014 the easy days actually feel easy now, which means the hard days can be hard on purpose instead of by accident.\n\nRace is October 12. Twelve weeks left.",
  },
  {
    id: 'n12', title: 'Gratitude log \u2014 week 3', category: 'Journal',
    tags: ['Personal'], createdAt: '2026-07-12', updatedAt: '2026-07-12',
    pinned: false, favorite: false, archived: false,
    content: "# Gratitude log \u2014 week 3\n\n- Sarah covering for me Tuesday without being asked\n- The kitchen actually being quiet enough to think in\n- Finishing something, even something small",
  },
  {
    id: 'n13', title: 'Weekly groceries', category: 'Shopping List',
    tags: ['Personal'], createdAt: '2026-07-25', updatedAt: '2026-07-25',
    pinned: true, favorite: false, archived: false,
    content: "# Weekly groceries\n\n- [ ] Eggs\n- [ ] Oat milk\n- [ ] Spinach\n- [ ] Chicken thighs\n- [ ] Rice\n- [ ] Coffee (the good kind, not the backup bag)\n- [ ] Dish soap",
  },
  {
    id: 'n14', title: 'Home renovation supplies', category: 'Shopping List',
    tags: ['Personal', 'Home'], createdAt: '2026-07-11', updatedAt: '2026-07-17',
    pinned: false, favorite: false, archived: false,
    content: "# Home renovation supplies\n\n## Kitchen\n- Cabinet hardware (get contractor's opinion first)\n- Tile samples \u2014 narrow down to 3\n\n## Living room\n- Paint swatches (warm neutral, not stark white)\n- Light fixture \u2014 pendant, not flush mount",
  },
  {
    id: 'n15', title: 'Debounce function (vanilla JS)', category: 'Code Snippet',
    tags: ['Atlas', 'Engineering'], createdAt: '2026-05-01', updatedAt: '2026-07-23',
    pinned: false, favorite: true, archived: false,
    content: "# Debounce function (vanilla JS)\n\nThe one I keep copy-pasting into every project:\n\n```js\nfunction debounce(fn, delay) {\n  let timer;\n  return (...args) => {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn(...args), delay);\n  };\n}\n```\n\nUsed it for the command palette's live filtering and the notes editor's auto-save. Same function, same 600ms delay, works everywhere.",
  },
  {
    id: 'n16', title: 'Postgres \u2014 soft delete pattern', category: 'Code Snippet',
    tags: ['Engineering', 'Infra'], createdAt: '2026-06-10', updatedAt: '2026-06-10',
    pinned: false, favorite: false, archived: false,
    content: "# Postgres \u2014 soft delete pattern\n\nInstead of DELETE, add a nullable deleted_at column:\n\n```sql\nALTER TABLE tasks ADD COLUMN deleted_at TIMESTAMPTZ;\n\n-- \"delete\"\nUPDATE tasks SET deleted_at = now() WHERE id = $1;\n\n-- every real query\nSELECT * FROM tasks WHERE deleted_at IS NULL;\n```\n\nEvery query needs the `deleted_at IS NULL` clause, which is exactly why a view or a Drizzle default scope is worth setting up before this pattern spreads to more tables.",
  },
  {
    id: 'n17', title: 'CSS: prefers-reduced-motion snippet', category: 'Code Snippet',
    tags: ['Atlas', 'Engineering'], createdAt: '2026-07-20', updatedAt: '2026-07-20',
    pinned: false, favorite: false, archived: false,
    content: "# CSS: prefers-reduced-motion snippet\n\nThe one that goes in literally every project's base stylesheet now:\n\n```css\n@media (prefers-reduced-motion: reduce) {\n  *, *::before, *::after {\n    animation-duration: 0.01ms !important;\n    transition-duration: 0.01ms !important;\n  }\n}\n```\n\nAlready in Atlas's base.css. Copying it here so I stop hunting for it every time.",
  },
];

export function allNoteTags() {
  return [...new Set(notes.flatMap((n) => n.tags || []))].sort();
}

// Hydration hook — see projects/data.js for why this replaces in place.
export function setNotes(list) {
  notes.splice(0, notes.length, ...list);
}

let idCounter = 1000;
export function createNoteId() {
  idCounter += 1;
  return `n${idCounter}-${Date.now()}`;
}
