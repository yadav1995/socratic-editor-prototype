/**
 * PostgreSQL connector — Architecture §12
 * DATABASE_URL read from server env only; never returned to client.
 */
const fs = require('fs');
const path = require('path');
const { analyzeSqlContent } = require('./sql-grounding');

const SAMPLES_DIR = path.join(__dirname, '..', '..', 'src', 'content', 'samples');

async function tryLiveQuery() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;

  try {
    const { Client } = require('pg');
    const client = new Client({ connectionString: url });
    await client.connect();
    const result = await client.query('SELECT 1 AS ok');
    await client.end();
    return {
      mode: 'live',
      connected: true,
      rowCount: result.rowCount,
      message: 'Live PostgreSQL connection verified (read-only ping)',
    };
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      return {
        mode: 'env_only',
        connected: false,
        message: 'DATABASE_URL set but pg module not installed. Run: npm install pg',
      };
    }
    return {
      mode: 'error',
      connected: false,
      message: `Database connection failed: ${err.message}`,
    };
  }
}

async function connectDatabase(body) {
  const { sqlContent, sampleFile, useServerDatabase } = body || {};

  if (useServerDatabase) {
    const live = await tryLiveQuery();
    if (live) {
      return {
        ...live,
        grounding: { grounded: live.connected, label: live.message },
      };
    }
  }

  let content = sqlContent;
  let fileName = 'uploaded.sql';

  if (sampleFile) {
    const safeName = path.basename(sampleFile);
    const samplePath = path.join(SAMPLES_DIR, safeName);
    if (!fs.existsSync(samplePath) || !safeName.endsWith('.sql')) {
      return { error: 'Sample SQL file not found', status: 404 };
    }
    content = fs.readFileSync(samplePath, 'utf8');
    fileName = safeName;
  }

  if (!content) {
    return {
      error: 'Provide sqlContent, sampleFile, or useServerDatabase with DATABASE_URL',
      status: 400,
    };
  }

  const analysis = analyzeSqlContent(content, fileName);

  return {
    mode: 'sql_file',
    connected: analysis.grounded,
    verified: analysis.grounded
      ? [{ type: 'database', name: fileName, icon: 'database' }]
      : [],
    grounding: {
      grounded: analysis.grounded,
      label: analysis.grounded
        ? `SQL Ground Truth Verified — ${analysis.summary}`
        : analysis.summary,
    },
    analysis,
    securityNote: 'No connection credentials were sent to or stored in the client.',
  };
}

module.exports = { connectDatabase, analyzeSqlContent };
