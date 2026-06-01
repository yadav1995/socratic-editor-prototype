/**
 * Server-side session persistence (Architecture §8.3 / Phase 4).
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const STATE_DIR = path.join(DATA_DIR, 'sessions');

function ensureStateDir() {
  if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
}

function statePath(sessionId) {
  return path.join(STATE_DIR, `${sessionId}.json`);
}

function getState(sessionId) {
  ensureStateDir();
  const file = statePath(sessionId);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function saveState(sessionId, state) {
  ensureStateDir();
  const payload = { ...state, sessionId, updatedAt: new Date().toISOString() };
  fs.writeFileSync(statePath(sessionId), JSON.stringify(payload, null, 2));
  return payload;
}

function mergeState(sessionId, partial) {
  const existing = getState(sessionId) || { sessionId, scenarios: {} };
  const merged = {
    ...existing,
    ...partial,
    scenarios: { ...existing.scenarios, ...(partial.scenarios || {}) },
    updatedAt: new Date().toISOString(),
  };
  return saveState(sessionId, merged);
}

module.exports = { getState, saveState, mergeState };
