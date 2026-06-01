/**
 * API integration tests (Architecture §13 / v8)
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const path = require('path');

const TEST_PORT = 3099;
const BASE = `http://127.0.0.1:${TEST_PORT}`;

let serverProcess;

function waitForServer(maxMs = 8000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const res = await fetch(`${BASE}/api/health`);
        if (res.ok) return resolve();
      } catch {
        // retry
      }
      if (Date.now() - start > maxMs) return reject(new Error('Server did not start'));
      setTimeout(tick, 200);
    };
    tick();
  });
}

before(async () => {
  serverProcess = spawn(
    process.execPath,
    [path.join(__dirname, '../server/server.js')],
    {
      env: { ...process.env, PORT: String(TEST_PORT) },
      stdio: 'pipe',
    }
  );
  await waitForServer();
});

after(() => {
  if (serverProcess) serverProcess.kill();
});

describe('API health', () => {
  it('GET /api/health returns ok', async () => {
    const res = await fetch(`${BASE}/api/health`);
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.ok, true);
  });

  it('GET /api/self-test passes', async () => {
    const res = await fetch(`${BASE}/api/self-test`);
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.ok, true);
    assert.ok(data.checks.length > 0);
  });
});

describe('API scenarios', () => {
  it('GET /api/scenarios lists catalog', async () => {
    const res = await fetch(`${BASE}/api/scenarios`);
    const data = await res.json();
    assert.ok(data.scenarios.length >= 1);
  });

  it('GET /api/scenarios/churn-analysis returns scenario', async () => {
    const res = await fetch(`${BASE}/api/scenarios/churn-analysis`);
    const data = await res.json();
    assert.equal(data.id, 'churn-analysis');
    assert.ok(data.draft.groundedParagraph);
  });
});

describe('API ingest & paradox', () => {
  it('POST /api/ingest verifies CSV', async () => {
    const res = await fetch(`${BASE}/api/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        files: [{ name: 'test.csv', content: 'id,reason\n1,too expensive\n2,pricing' }],
      }),
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.grounded, true);
  });

  it('POST /api/detect-paradox returns paradox flag', async () => {
    const res = await fetch(`${BASE}/api/detect-paradox`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenarioId: 'churn-analysis',
        draft: {
          groundedParagraph: 'pricing cited in surveys',
          speculativeParagraph: 'redesign onboarding wizard flow',
        },
      }),
    });
    const data = await res.json();
    assert.equal(data.hasParadox, true);
  });
});

describe('API database connect (v9)', () => {
  it('POST /api/connect-database verifies sample SQL', async () => {
    const res = await fetch(`${BASE}/api/connect-database`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sampleFile: 'postgres_dropoff_logs.sql' }),
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.mode, 'sql_file');
    assert.equal(data.connected, true);
    assert.ok(data.securityNote);
  });
});

describe('Static assets', () => {
  it('GET / serves index.html with device shell', async () => {
    const res = await fetch(`${BASE}/`);
    const html = await res.text();
    assert.equal(res.status, 200);
    assert.ok(html.includes('device-shell'));
    assert.ok(html.includes('paradox-badge'));
    assert.ok(html.includes('ds-paradox-badge') || html.includes('paradox-badge'));
  });
});
