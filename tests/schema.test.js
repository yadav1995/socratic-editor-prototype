/**
 * Validates all scenario JSON files against §8.1 schema (v8)
 */
const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { validateAllScenarios } = require('../server/services/schema-validator');

const SCENARIOS_DIR = path.join(__dirname, '../src/content/scenarios');

describe('Scenario catalog schema', () => {
  it('all scenario files pass validation', () => {
    const report = validateAllScenarios(SCENARIOS_DIR);
    if (!report.allValid) {
      const failures = report.results.filter((r) => !r.valid);
      console.error(failures);
    }
    assert.equal(report.allValid, true);
    assert.ok(report.results.length >= 3);
  });
});
