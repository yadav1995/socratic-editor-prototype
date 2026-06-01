#!/usr/bin/env node
/**
 * Manual test checklist automation — Architecture §13.1 (v8)
 * Usage: node scripts/smoke-checklist.js [baseUrl]
 */
const BASE = process.argv[2] || 'http://localhost:3000';

const CHECKS = [
  { id: 1, label: 'Health endpoint responds', run: () => get('/api/health') },
  { id: 2, label: 'Self-test passes', run: () => get('/api/self-test').then((d) => assertOk(d.ok)) },
  { id: 3, label: 'Scenarios catalog loads', run: () => get('/api/scenarios').then((d) => assertOk(d.scenarios?.length)) },
  { id: 4, label: 'Churn scenario has ground truth', run: () => get('/api/scenarios/churn-analysis').then((d) => assertOk(d.groundTruth?.length >= 2)) },
  { id: 5, label: 'Index has device shell (375×812)', run: () => fetch(`${BASE}/`).then((r) => r.text()).then((h) => assertOk(h.includes('device-shell') && h.includes('375'))) },
  { id: 6, label: 'Ground truth list element present', run: () => fetch(`${BASE}/`).then((r) => r.text()).then((h) => assertOk(h.includes('ground-truth-list'))) },
  { id: 7, label: 'Context badge present', run: () => fetch(`${BASE}/`).then((r) => r.text()).then((h) => assertOk(h.includes('context-badge'))) },
  { id: 8, label: 'Paradox badge uses design system', run: () => fetch(`${BASE}/`).then((r) => r.text()).then((h) => assertOk(h.includes('paradox-badge'))) },
  { id: 9, label: 'Speculative block present', run: () => fetch(`${BASE}/`).then((r) => r.text()).then((h) => assertOk(h.includes('speculative-block'))) },
  { id: 10, label: 'Sheet panel dialog present', run: () => fetch(`${BASE}/`).then((r) => r.text()).then((h) => assertOk(h.includes('sheet-panel') && h.includes('role="dialog"'))) },
  { id: 11, label: 'Route options container present', run: () => fetch(`${BASE}/`).then((r) => r.text()).then((h) => assertOk(h.includes('route-options'))) },
  { id: 12, label: 'Apply pivot button present', run: () => fetch(`${BASE}/`).then((r) => r.text()).then((h) => assertOk(h.includes('btn-apply-pivot'))) },
  { id: 13, label: 'No trust chart widgets', run: () => fetch(`${BASE}/`).then((r) => r.text()).then((h) => assertOk(!h.includes('trust-score') && !h.includes('confidence-meter'))) },
  { id: 14, label: 'Sample CSV accessible', run: () => getRaw('/content/samples/100_Exit_Surveys.csv').then((t) => assertOk(t.includes('too expensive'))) },
  { id: 15, label: 'SQL database connect works', run: () => post('/api/connect-database', { sampleFile: 'postgres_dropoff_logs.sql' }).then((d) => assertOk(d.connected)) },
];

function assertOk(cond) {
  if (!cond) throw new Error('Assertion failed');
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${path} returned ${res.status}`);
  return res.json();
}

async function getRaw(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${path} returned ${res.status}`);
  return res.text();
}

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} returned ${res.status}`);
  return res.json();
}

async function main() {
  console.log(`\nSocratic Editor — Smoke Checklist (§13.1)\nBase: ${BASE}\n`);
  let passed = 0;
  let failed = 0;

  for (const check of CHECKS) {
    try {
      await check.run();
      console.log(`  ✓ [${check.id}] ${check.label}`);
      passed++;
    } catch (err) {
      console.log(`  ✗ [${check.id}] ${check.label}`);
      console.log(`      ${err.message}`);
      failed++;
    }
  }

  console.log(`\n${passed}/${CHECKS.length} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
