/**
 * Unit tests — server services (Architecture §13 / v8)
 */
const { describe, it } = require('node:test');
const assert = require('node:assert');
const { redactContent } = require('../server/services/pii-redactor');
const { detectParadox } = require('../server/services/paradox-detector');
const { computeWindow } = require('../server/services/context-window');
const { analyzeSqlContent } = require('../server/services/sql-grounding');
const { validateScenario } = require('../server/services/schema-validator');
const path = require('path');
const fs = require('fs');

describe('PII redactor', () => {
  it('redacts email addresses', () => {
    const { redacted, redactions } = redactContent('Contact user@example.com for info');
    assert.ok(!redacted.includes('user@example.com'));
    assert.ok(redactions.some((r) => r.type === 'email'));
  });
});

describe('Paradox detector', () => {
  it('detects behavioral vs qualitative conflict', () => {
    const draft = {
      groundedParagraph: 'Exit surveys cite pricing as top churn reason.',
      speculativeParagraph: 'We should redesign the onboarding wizard to reduce drop-off.',
    };
    const result = detectParadox(draft, { confession: { metaCommentary: 'survey vs logs' } });
    assert.equal(result.hasParadox, true);
    assert.ok(result.confidence > 0);
  });
});

describe('Context window', () => {
  it('computes utilization under 2M tokens', () => {
    const cw = computeWindow([{ name: 'test.csv', content: 'a'.repeat(4000) }]);
    assert.ok(cw.usedTokens < cw.maxTokens);
    assert.ok(cw.active);
  });
});

describe('SQL grounding', () => {
  it('parses SQL file for tables', () => {
    const sql = 'SELECT screen_name, COUNT(*) FROM session_events GROUP BY screen_name';
    const result = analyzeSqlContent(sql, 'logs.sql');
    assert.equal(result.grounded, true);
    assert.ok(result.signals.tables.includes('session_events'));
  });
});

describe('Schema validator', () => {
  it('validates churn-analysis scenario', () => {
    const scenario = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, '../src/content/scenarios/churn-analysis.json'),
        'utf8'
      )
    );
    const { valid, error } = validateScenario(scenario);
    assert.equal(valid, true, error);
  });

  it('rejects invalid scenario', () => {
    const { valid } = validateScenario({ id: 'x' });
    assert.equal(valid, false);
  });
});
