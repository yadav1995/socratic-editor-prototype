/**
 * Scenario renderer — delegates to screen components (Phase 5 / Architecture §5).
 */
const ScenarioRenderer = (() => {
  function renderAll(scenario, sources) {
    const { contextWindow, paradox } = ScenarioStore.getActive();
    ScreenIngestion.render(scenario, sources, contextWindow);
    ScreenDraft.renderTitle(scenario);
    ScreenDraft.renderDraft(scenario.draft, scenario._showParadox !== false);
    SheetConfession.render(scenario, paradox);
  }

  function renderIngestionScreen(scenario, sources) {
    const { contextWindow } = ScenarioStore.getActive();
    ScreenIngestion.render(scenario, sources, contextWindow);
  }

  function renderDraftScreen(scenario) {
    ScreenDraft.renderTitle(scenario);
    ScreenDraft.renderDraft(scenario.draft, scenario._showParadox !== false);
    SheetConfession.render(scenario, ScenarioStore.getActive().paradox);
  }

  return { renderAll, renderIngestionScreen, renderDraftScreen };
})();
