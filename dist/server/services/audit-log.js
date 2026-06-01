/**
 * Audit log for human route selections (Architecture §12).
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const AUDIT_FILE = path.join(DATA_DIR, 'audit-log.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readLog() {
  ensureDataDir();
  if (!fs.existsSync(AUDIT_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeLog(entries) {
  ensureDataDir();
  fs.writeFileSync(AUDIT_FILE, JSON.stringify(entries, null, 2));
}

function appendEntry(entry) {
  const log = readLog();
  const record = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };
  log.push(record);
  if (log.length > 500) log.splice(0, log.length - 500);
  writeLog(log);
  return record;
}

function getRecent(limit = 20) {
  return readLog().slice(-limit).reverse();
}

module.exports = { appendEntry, getRecent };
