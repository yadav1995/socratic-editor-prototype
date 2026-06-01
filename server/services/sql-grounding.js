/**
 * SQL file grounding analysis — Architecture §8.3 / §12 (Phase v9)
 * Connection strings never exposed to client; analyzes SQL text server-side.
 */
function analyzeSqlContent(sqlContent, fileName = 'query.sql') {
  if (!sqlContent || sqlContent.length < 10) {
    return { grounded: false, reason: 'SQL content too short' };
  }

  const tables = [...sqlContent.matchAll(/(?:FROM|JOIN)\s+([a-zA-Z_][\w.]*)/gi)]
    .map((m) => m[1].toLowerCase());
  const metrics = [...sqlContent.matchAll(/(COUNT|SUM|AVG|drop_off|churn|week_\w+)/gi)]
    .map((m) => m[0].toLowerCase());
  const hasSelect = /\bSELECT\b/i.test(sqlContent);
  const hasGroupBy = /\bGROUP BY\b/i.test(sqlContent);

  const signals = {
    tables: [...new Set(tables)],
    metrics: [...new Set(metrics)],
    hasSelect,
    hasGroupBy,
    lineCount: sqlContent.split('\n').filter((l) => l.trim() && !l.trim().startsWith('--')).length,
  };

  const grounded = hasSelect && (signals.tables.length > 0 || signals.lineCount >= 2);

  return {
    grounded,
    fileName,
    type: 'database',
    icon: 'database',
    signals,
    summary: grounded
      ? `SQL source verified: ${signals.tables.length || 'anonymous'} table(s), ${signals.lineCount} statement line(s)`
      : 'SQL could not be verified as analytical ground truth',
  };
}

module.exports = { analyzeSqlContent };
