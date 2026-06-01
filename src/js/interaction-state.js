/**
 * Central interaction state — Architecture §6.3 (Phase 6)
 */
const InteractionState = (() => {
  const state = {
    currentScreen: 'ingestion',
    sheetOpen: false,
    sheetPhase: 'closed', // closed | opening | open | closing
    selectedRoute: 'route-b',
    isEditingDraft: false,
    auditPanelOpen: false,
  };

  const listeners = new Set();

  function get() {
    return { ...state };
  }

  function set(partial) {
    Object.assign(state, partial);
    listeners.forEach((fn) => fn(get()));
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  return { get, set, subscribe };
})();
