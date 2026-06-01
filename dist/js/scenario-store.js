/**
 * Scenario store — localStorage + backend sync (Phase 3 / 4).
 */
const ScenarioStore = (() => {
  const STORAGE_KEY = 'socratic-editor-state';

  let catalog = [];
  let activeScenario = null;
  let activeId = null;
  let contextWindow = null;
  let lastParadox = null;
  let persisted = loadPersisted();

  function loadPersisted() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
      return {};
    }
  }

  function savePersisted() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
    const sessionId = AuditClient.getSessionId();
    StateSync.schedulePush(sessionId, persisted);
  }

  async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}`);
    return res.json();
  }

  async function loadCatalog() {
    try {
      const data = await fetchJson('/api/scenarios');
      catalog = data.scenarios || [];
    } catch {
      catalog = [{ id: 'churn-analysis', title: 'Churn Analysis', default: true }];
    }
    return catalog;
  }

  async function loadScenario(id) {
    const scenario = await fetchJson(`/api/scenarios/${id}`);
    activeScenario = scenario;
    activeId = id;

    const saved = persisted.scenarios?.[id];
    if (saved) {
      if (saved.draft) activeScenario.draft = { ...activeScenario.draft, ...saved.draft };
      if (saved.appliedRoute) activeScenario._appliedRoute = saved.appliedRoute;
      if (saved.extraSources) activeScenario._extraSources = saved.extraSources;
      if (saved.showParadox !== undefined) activeScenario._showParadox = saved.showParadox;
      if (saved.contextWindow) contextWindow = saved.contextWindow;
    }

    return activeScenario;
  }

  async function init(preferredId) {
    const sessionId = AuditClient.getSessionId();
    persisted = await StateSync.mergeFromServer(sessionId, loadPersisted());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));

    await loadCatalog();
    const id = preferredId
      || persisted.activeScenarioId
      || catalog.find((s) => s.default)?.id
      || catalog[0]?.id
      || 'churn-analysis';
    return loadScenario(id);
  }

  async function switchScenario(id) {
    if (activeId) saveScenarioState();
    await loadScenario(id);
    persisted.activeScenarioId = id;
    savePersisted();
    return activeScenario;
  }

  function saveScenarioState() {
    if (!activeId || !activeScenario) return;
    if (!persisted.scenarios) persisted.scenarios = {};
    persisted.scenarios[activeId] = {
      draft: activeScenario.draft,
      appliedRoute: activeScenario._appliedRoute || null,
      extraSources: activeScenario._extraSources || [],
      showParadox: activeScenario._showParadox !== false,
      contextWindow,
    };
    persisted.activeScenarioId = activeId;
    savePersisted();
  }

  function updateDraft(draft) {
    if (!activeScenario) return;
    activeScenario.draft = { ...activeScenario.draft, ...draft };
    saveScenarioState();
  }

  function setAppliedRoute(routeId) {
    if (!activeScenario) return;
    activeScenario._appliedRoute = routeId;
    saveScenarioState();
  }

  function addExtraSources(sources) {
    if (!activeScenario) return;
    activeScenario._extraSources = [...(activeScenario._extraSources || []), ...sources];
    saveScenarioState();
  }

  function setContextWindow(cw) {
    contextWindow = cw;
    if (activeScenario && cw) {
      activeScenario.contextStatus = cw.contextStatus || {
        label: cw.label,
        grounded: cw.active,
      };
    }
    saveScenarioState();
  }

  function setParadox(paradox) {
    lastParadox = paradox;
    if (activeScenario && paradox?.hasParadox === false) {
      activeScenario._showParadox = false;
    }
  }

  function getAllSources() {
    if (!activeScenario) return [];
    return [...(activeScenario.groundTruth || []), ...(activeScenario._extraSources || [])];
  }

  function getActive() {
    return { scenario: activeScenario, id: activeId, catalog, contextWindow, paradox: lastParadox };
  }

  return {
    init,
    switchScenario,
    saveScenarioState,
    updateDraft,
    setAppliedRoute,
    addExtraSources,
    setContextWindow,
    setParadox,
    getAllSources,
    getActive,
    loadCatalog,
  };
})();
