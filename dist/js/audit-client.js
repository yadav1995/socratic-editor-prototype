/**
 * Audit client — logs human override decisions (Phase 4 / Architecture §12).
 */
const AuditClient = (() => {
  const SESSION_KEY = 'socratic-session-id';

  function getSessionId() {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  }

  async function log(action, data = {}) {
    try {
      await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          sessionId: getSessionId(),
          ...data,
        }),
      });
    } catch {
      // audit is best-effort
    }
  }

  async function logPivot(scenarioId, routeId, metadata = {}) {
    return log('structural_pivot', { scenarioId, routeId, metadata });
  }

  async function logGeneration(scenarioId, mode) {
    return log('draft_generated', { scenarioId, metadata: { mode } });
  }

  async function logIngestion(scenarioId, sourceCount, piiRedactions) {
    return log('sources_ingested', {
      scenarioId,
      metadata: { sourceCount, piiRedactions },
    });
  }

  return { getSessionId, log, logPivot, logGeneration, logIngestion };
})();
