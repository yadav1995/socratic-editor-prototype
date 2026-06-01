/**
 * Scenario schema validation — Architecture §8.1 (Phase v8)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const SCHEMA_PATH = path.join(ROOT, 'src', 'content', 'schema', 'scenario.schema.json');

function loadSchema() {
  return JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
}

function validateType(value, schema) {
  if (schema.type === 'string') {
    if (typeof value !== 'string') return `expected string, got ${typeof value}`;
    if (schema.minLength && value.length < schema.minLength) {
      return `string shorter than minLength ${schema.minLength}`;
    }
    if (schema.enum && !schema.enum.includes(value)) {
      return `value not in enum: ${schema.enum.join(', ')}`;
    }
    return null;
  }
  if (schema.type === 'boolean') {
    return typeof value === 'boolean' ? null : 'expected boolean';
  }
  if (schema.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return 'expected object';
    if (schema.required) {
      for (const key of schema.required) {
        if (!(key in value)) return `missing required property: ${key}`;
      }
    }
    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (key in value) {
          const err = validateType(value[key], propSchema);
          if (err) return `${key}: ${err}`;
        }
      }
    }
    return null;
  }
  if (schema.type === 'array') {
    if (!Array.isArray(value)) return 'expected array';
    if (schema.minItems && value.length < schema.minItems) {
      return `array shorter than minItems ${schema.minItems}`;
    }
    if (schema.items) {
      for (let i = 0; i < value.length; i++) {
        const err = validateType(value[i], schema.items);
        if (err) return `[${i}]: ${err}`;
      }
    }
    return null;
  }
  return null;
}

function validateScenario(scenario) {
  const schema = loadSchema();
  const error = validateType(scenario, schema);
  return { valid: !error, error };
}

function validateAllScenarios(scenariosDir) {
  const results = [];
  const files = fs.readdirSync(scenariosDir).filter((f) => f.endsWith('.json') && f !== 'index.json');

  for (const file of files) {
    const filePath = path.join(scenariosDir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const result = validateScenario(data);
    results.push({ file, id: data.id, ...result });
  }

  return {
    allValid: results.every((r) => r.valid),
    results,
  };
}

module.exports = { validateScenario, validateAllScenarios, loadSchema };
