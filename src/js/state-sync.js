/**
 * Backend state sync — mirrors localStorage to server (Phase 4).
 */
const StateSync = (() => {
  let syncTimer = null;

  async function pull(sessionId) {
    try {
      const res = await fetch(`/api/state/${sessionId}`);
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  }

  async function push(sessionId, state) {
    try {
      await fetch(`/api/state/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      });
    } catch {
      // sync is best-effort
    }
  }

  function schedulePush(sessionId, state, delayMs = 800) {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => push(sessionId, state), delayMs);
  }

  async function mergeFromServer(sessionId, localState) {
    const remote = await pull(sessionId);
    if (!remote?.scenarios) return localState;

    const merged = { ...localState, scenarios: { ...remote.scenarios, ...localState.scenarios } };
    if (remote.activeScenarioId && !localState.activeScenarioId) {
      merged.activeScenarioId = remote.activeScenarioId;
    }
    return merged;
  }

  return { pull, push, schedulePush, mergeFromServer };
})();
