/**
 * Socratic Editor API server (zero npm dependencies).
 * Phase 2: Gemini streaming + ingestion verification
 * Phase 4: Paradox detector, audit log, PII redaction, backend persistence
 * Serves static frontend from ../src
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { redactFiles } = require('./services/pii-redactor');
const { detectParadox } = require('./services/paradox-detector');
const auditLog = require('./services/audit-log');
const persistence = require('./services/persistence');
const { computeWindow } = require('./services/context-window');
const { validateAllScenarios } = require('./services/schema-validator');
const { connectDatabase } = require('./services/postgres-connector');
const { redactContent } = require('./services/pii-redactor');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const SCENARIOS_DIR = path.join(SRC, 'content', 'scenarios');
const PORT = Number(process.env.PORT) || 3000;
const GEMINI_API_KEY = loadEnvKey('GEMINI_API_KEY');
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function loadEnvKey(name) {
  if (process.env[name]) return process.env[name];
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return '';
  const line = fs.readFileSync(envPath, 'utf8')
    .split('\n')
    .find((l) => l.startsWith(`${name}=`));
  return line ? line.slice(name.length + 1).trim() : '';
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function serveStatic(req, res, filePath) {
  if (!filePath.startsWith(SRC)) {
    sendJson(res, 403, { error: 'Forbidden' });
    return;
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    sendJson(res, 404, { error: 'Not found' });
    return;
  }
  const ext = path.extname(filePath);
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
}

function validateSource(name, content) {
  const ext = path.extname(name).toLowerCase();
  const allowed = ['.csv', '.sql', '.json'];
  if (!allowed.includes(ext)) {
    return { valid: false, reason: `Unsupported file type: ${ext}` };
  }
  if (!content || content.length < 10) {
    return { valid: false, reason: 'File content too short to verify grounding' };
  }
  const type = ext === '.sql' ? 'database' : 'file';
  return { valid: true, type, name, icon: type === 'database' ? 'database' : 'document' };
}

function buildGeminiPrompt(scenario, extraSources) {
  const sources = [...(scenario.groundTruth || []), ...(extraSources || [])]
    .map((s) => s.name)
    .join(', ');
  return `You are the Socratic Editor AI generating an analytical framework draft.

Scenario: ${scenario.project?.title || scenario.id}
Ground truth sources: ${sources}
Context: ${scenario.generatePrompt || 'Generate a framework with grounded facts and one speculative recommendation that may conflict with survey/interview data.'}

Respond with EXACTLY these three sections (include the markers):

[GROUNDED]
One paragraph of factual, evidence-based analysis drawn from the ground truth sources. Crisp professional tone.

[SPECULATIVE]
One paragraph proposing a solution that leaps beyond what surveys might support — focus on the obvious behavioral interpretation.

[CONFESSION]
One paragraph explaining the internal disagreement — why the speculative section might be wrong based on conflicting qualitative data from surveys or interviews.`;
}

function parseDraftSections(text) {
  const grounded = text.match(/\[GROUNDED\]\s*([\s\S]*?)(?=\[SPECULATIVE\]|$)/i)?.[1]?.trim() || '';
  const speculative = text.match(/\[SPECULATIVE\]\s*([\s\S]*?)(?=\[CONFESSION\]|$)/i)?.[1]?.trim() || '';
  const confession = text.match(/\[CONFESSION\]\s*([\s\S]*?)$/i)?.[1]?.trim() || '';
  return { grounded, speculative, confession };
}

async function streamGemini(prompt, onChunk) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${err.slice(0, 200)}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (payload === '[DONE]') continue;
      try {
        const json = JSON.parse(payload);
        const chunk = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (chunk) {
          fullText += chunk;
          onChunk({ type: 'token', text: chunk });
        }
      } catch {
        // skip malformed SSE lines
      }
    }
  }

  return fullText;
}

async function simulateStream(scenario, onChunk) {
  const draft = scenario.draft || {};
  const confession = scenario.confession?.metaCommentary || '';
  const full = `[GROUNDED]\n${draft.groundedParagraph}\n\n[SPECULATIVE]\n${draft.speculativeParagraph}\n\n[CONFESSION]\n${confession}`;
  const words = full.split(/(\s+)/);
  for (const word of words) {
    onChunk({ type: 'token', text: word });
    await new Promise((r) => setTimeout(r, 18));
  }
  return full;
}

function handleSse(res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };
  return { send, end: () => res.end() };
}

async function handleGenerateDraft(req, res) {
  const body = await parseBody(req);
  const scenarioId = body.scenarioId || 'churn-analysis';
  const extraSources = body.sources || [];
  const scenarioPath = path.join(SCENARIOS_DIR, `${scenarioId}.json`);

  if (!fs.existsSync(scenarioPath)) {
    sendJson(res, 404, { error: 'Scenario not found' });
    return;
  }

  const scenario = readJson(scenarioPath);
  const sse = handleSse(res);
  const useGemini = Boolean(GEMINI_API_KEY);

  sse.send('start', { mode: useGemini ? 'gemini' : 'simulated', scenarioId });

  try {
    const onChunk = (data) => sse.send('token', data);
    const fullText = useGemini
      ? await streamGemini(buildGeminiPrompt(scenario, extraSources), onChunk)
      : await simulateStream(scenario, onChunk);

    const parsed = parseDraftSections(fullText);
    const draft = {
      groundedParagraph: parsed.grounded || scenario.draft.groundedParagraph,
      speculativeParagraph: parsed.speculative || scenario.draft.speculativeParagraph,
      paradoxBadgeLabel: scenario.draft.paradoxBadgeLabel,
    };
    const paradox = detectParadox(draft, scenario);

    if (paradox.hasParadox) {
      draft.paradoxBadgeLabel = paradox.badgeLabel;
    }

    sse.send('complete', {
      draft,
      confession: parsed.confession
        ? { metaCommentary: parsed.confession }
        : undefined,
      paradox,
    });
  } catch (err) {
    sse.send('error', { message: err.message });
  }

  sse.end();
}

async function handleIngest(req, res) {
  const body = await parseBody(req);
  const rawFiles = body.files || [];
  const redactedFiles = redactFiles(rawFiles);
  const verified = [];
  const rejected = [];
  let totalRedactions = 0;

  for (const file of redactedFiles) {
    totalRedactions += (file.redactions || []).reduce((s, r) => s + r.count, 0);
    const result = validateSource(file.name, file.content || '');
    if (result.valid) {
      verified.push({
        type: result.type,
        name: result.name,
        icon: result.icon,
        content: file.content,
        redactions: file.redactions || [],
      });
    } else {
      rejected.push({ name: file.name, reason: result.reason });
    }
  }

  const contextWindow = computeWindow(verified);
  const grounded = verified.length > 0 && rejected.length === 0 && contextWindow.active;

  sendJson(res, 200, {
    grounded,
    verified: verified.map(({ content, ...rest }) => rest),
    rejected,
    piiRedactions: totalRedactions,
    contextWindow,
    contextStatus: {
      label: contextWindow.label,
      grounded,
    },
  });
}

async function handleDetectParadox(req, res) {
  const body = await parseBody(req);
  const scenarioId = body.scenarioId || 'churn-analysis';
  const scenarioPath = path.join(SCENARIOS_DIR, `${scenarioId}.json`);
  const scenario = fs.existsSync(scenarioPath) ? readJson(scenarioPath) : {};
  const paradox = detectParadox(body.draft || {}, scenario);
  sendJson(res, 200, paradox);
}

async function handleAudit(req, res) {
  const body = await parseBody(req);
  const record = auditLog.appendEntry({
    action: body.action,
    scenarioId: body.scenarioId,
    routeId: body.routeId,
    sessionId: body.sessionId,
    metadata: body.metadata || {},
  });
  sendJson(res, 201, record);
}

async function handleGetAudit(req, res) {
  sendJson(res, 200, { entries: auditLog.getRecent(20) });
}

async function handleGetState(req, res, sessionId) {
  const state = persistence.getState(sessionId);
  sendJson(res, 200, state || { sessionId, scenarios: {} });
}

async function handleSaveState(req, res, sessionId) {
  const body = await parseBody(req);
  const saved = persistence.mergeState(sessionId, body);
  sendJson(res, 200, saved);
}

function runSelfTest() {
  const checks = [];

  try {
    const scenarios = validateAllScenarios(SCENARIOS_DIR);
    checks.push({ name: 'scenario_schema', ok: scenarios.allValid });
  } catch (e) {
    checks.push({ name: 'scenario_schema', ok: false, error: e.message });
  }

  const pii = redactContent('email test@x.com');
  checks.push({ name: 'pii_redactor', ok: pii.redactions.length > 0 });

  const paradox = detectParadox(
    { groundedParagraph: 'pricing', speculativeParagraph: 'onboarding wizard' },
    { confession: { metaCommentary: 'x' } }
  );
  checks.push({ name: 'paradox_detector', ok: paradox.hasParadox });

  const cw = computeWindow([{ name: 'a.csv', content: 'data' }]);
  checks.push({ name: 'context_window', ok: cw.active });

  checks.push({ name: 'gemini_configured', ok: true, configured: Boolean(GEMINI_API_KEY) });
  checks.push({ name: 'static_index', ok: fs.existsSync(path.join(SRC, 'index.html')) });
  checks.push({ name: 'sample_csv', ok: fs.existsSync(path.join(SRC, 'content', 'samples', '100_Exit_Surveys.csv')) });
  checks.push({ name: 'sample_sql', ok: fs.existsSync(path.join(SRC, 'content', 'samples', 'postgres_dropoff_logs.sql')) });

  const ok = checks.every((c) => c.ok);
  return { ok, checks, phase: 8 };
}

async function handleSelfTest(req, res) {
  sendJson(res, 200, runSelfTest());
}

async function handleValidateScenarios(req, res) {
  const report = validateAllScenarios(SCENARIOS_DIR);
  sendJson(res, report.allValid ? 200 : 422, report);
}

async function handleConnectDatabase(req, res) {
  const body = await parseBody(req);
  const result = await connectDatabase(body);
  if (result.status) {
    sendJson(res, result.status, { error: result.error });
    return;
  }
  sendJson(res, 200, result);
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  try {
    if (pathname === '/api/health') {
      sendJson(res, 200, {
        ok: true,
        geminiConfigured: Boolean(GEMINI_API_KEY),
        model: GEMINI_MODEL,
        phase: 8,
        features: [
          'paradox-detector', 'audit-log', 'pii-redaction',
          'backend-persistence', 'context-window',
          'interaction-state', 'design-tokens',
          'automated-tests', 'sql-grounding', 'production-build',
        ],
      });
      return;
    }

    if (pathname === '/api/self-test' && req.method === 'GET') {
      await handleSelfTest(req, res);
      return;
    }

    if (pathname === '/api/validate-scenarios' && req.method === 'GET') {
      await handleValidateScenarios(req, res);
      return;
    }

    if (pathname === '/api/connect-database' && req.method === 'POST') {
      await handleConnectDatabase(req, res);
      return;
    }

    if (pathname === '/api/scenarios' && req.method === 'GET') {
      const indexPath = path.join(SCENARIOS_DIR, 'index.json');
      sendJson(res, 200, readJson(indexPath));
      return;
    }

    if (pathname.startsWith('/api/scenarios/') && req.method === 'GET') {
      const id = pathname.split('/').pop();
      const scenarioPath = path.join(SCENARIOS_DIR, `${id}.json`);
      if (!fs.existsSync(scenarioPath)) {
        sendJson(res, 404, { error: 'Scenario not found' });
        return;
      }
      sendJson(res, 200, readJson(scenarioPath));
      return;
    }

    if (pathname === '/api/ingest' && req.method === 'POST') {
      await handleIngest(req, res);
      return;
    }

    if (pathname === '/api/generate-draft' && req.method === 'POST') {
      await handleGenerateDraft(req, res);
      return;
    }

    if (pathname === '/api/detect-paradox' && req.method === 'POST') {
      await handleDetectParadox(req, res);
      return;
    }

    if (pathname === '/api/audit' && req.method === 'GET') {
      await handleGetAudit(req, res);
      return;
    }

    if (pathname === '/api/audit' && req.method === 'POST') {
      await handleAudit(req, res);
      return;
    }

    if (pathname.startsWith('/api/state/') && req.method === 'GET') {
      const sessionId = pathname.split('/').pop();
      await handleGetState(req, res, sessionId);
      return;
    }

    if (pathname.startsWith('/api/state/') && req.method === 'POST') {
      const sessionId = pathname.split('/').pop();
      await handleSaveState(req, res, sessionId);
      return;
    }

    let filePath = pathname === '/' ? path.join(SRC, 'index.html') : path.join(SRC, pathname);
    serveStatic(req, res, filePath);
  } catch (err) {
    sendJson(res, 500, { error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`Socratic Editor server running at http://localhost:${PORT}`);
  console.log(`Gemini: ${GEMINI_API_KEY ? 'configured' : 'not configured (simulated streaming)'}`);
});
