/**
 * Bootstrap — Phase 4 & 5 integration.
 */
const App = (() => {
  let state = { selectedRoute: 'route-b', isGenerating: false, lastGenMode: 'simulated' };
  let streamBuffer = '';
  let streamTarget = 'draft-grounded';

  async function handleGenerateFramework() {
    const { scenario, id } = ScenarioStore.getActive();
    if (!scenario || state.isGenerating) return;

    state.isGenerating = true;
    ScreenDraft.clearDraft();
    ScreenDraft.showStreaming(true);
    ProgressTracker.setStep('draft');
    Router.goToDraft();
    if (typeof OnboardingTour !== 'undefined') OnboardingTour.onGenerate();

    const btn = document.getElementById('btn-generate-framework');
    if (btn) {
      btn.disabled = true;
      const btnText = btn.querySelector('span:first-child');
      if (btnText) btnText.textContent = 'Generating…';
    }

    streamBuffer = '';
    streamTarget = 'draft-grounded';

    await GeminiClient.generateDraft({
      scenarioId: id,
      sources: ScenarioStore.getAllSources(),
      onStart: (data) => {
        state.lastGenMode = data.mode;
        updateGenerationBadge(data.mode);
      },
      onToken: (token) => handleStreamToken(token),
      onComplete: (data) => handleGenerationComplete(data),
      onError: (err) => handleGenerationError(err, scenario),
    });

    resetGenerateButton();
  }

  function updateGenerationBadge(mode) {
    const badge = document.getElementById('gemini-status');
    if (!badge) return;
    badge.textContent = mode === 'gemini' ? 'Live Gemini stream' : 'Simulated stream';
    badge.style.display = 'inline-block';
  }

  function handleStreamToken(token) {
    streamBuffer += token;

    if (streamBuffer.includes('[SPECULATIVE]') && streamTarget === 'draft-grounded') {
      streamTarget = 'draft-speculative';
      const idx = streamBuffer.indexOf('[SPECULATIVE]');
      const groundedPart = streamBuffer.slice(0, idx).replace(/\[GROUNDED\]\s*/i, '');
      document.getElementById('draft-grounded').textContent = groundedPart.trim();
      streamBuffer = streamBuffer.slice(idx + '[SPECULATIVE]'.length);
    }

    if (streamTarget === 'draft-grounded' && !streamBuffer.includes('[GROUNDED]')) {
      PivotEngine.appendStreamToken('draft-grounded', token);
    } else if (streamTarget === 'draft-grounded') {
      const cleaned = streamBuffer.replace(/\[GROUNDED\]\s*/i, '');
      if (!cleaned.includes('[SPECULATIVE]')) {
        document.getElementById('draft-grounded').textContent = cleaned.trim();
      }
    } else if (streamTarget === 'draft-speculative' && !streamBuffer.includes('[CONFESSION]')) {
      document.getElementById('draft-speculative').textContent = streamBuffer.trim();
    }
  }

  function handleGenerationComplete(data) {
    const { scenario, id } = ScenarioStore.getActive();
    if (data.draft) {
      ScenarioStore.updateDraft(data.draft);
      if (data.confession?.metaCommentary) {
        scenario.confession.metaCommentary = data.confession.metaCommentary;
      }
    }
    if (data.paradox) {
      ScenarioStore.setParadox(data.paradox);
      if (data.paradox.hasParadox) scenario._showParadox = true;
    }
    ScenarioRenderer.renderDraftScreen(scenario);
    ScenarioStore.saveScenarioState();
    AuditClient.logGeneration(id, state.lastGenMode);
    ScreenDraft.showStreaming(false);
  }

  function handleGenerationError(err, scenario) {
    ScenarioRenderer.renderDraftScreen(scenario);
    ScreenIngestion.showIngestStatus(`Generation fallback: ${err.message}`);
    ScreenDraft.showStreaming(false);
  }

  function handleApplyPivot() {
    const route = document.querySelector('input[name="route"]:checked')?.value || state.selectedRoute;
    const { scenario, id } = ScenarioStore.getActive();
    if (!scenario) return;

    const result = PivotEngine.applyPivot(scenario, route);
    ScreenDraft.renderDraft(result.draft, result.showParadox);
    ScenarioStore.setAppliedRoute(route);
    ScenarioStore.updateDraft(result.draft);
    state.selectedRoute = route;

    const routeLabel = scenario.confession.routes.find((r) => r.id === route)?.label || route;
    ScreenDraft.showPivotApplied(routeLabel);
    AuditClient.logPivot(id, route, { showParadox: result.showParadox });

    // Flash visual cards to highlight the paragraph rewrites
    const groundedCard = document.getElementById('draft-grounded')?.closest('.draft-card');
    const speculativeBlock = document.getElementById('speculative-block');
    
    if (groundedCard) {
      groundedCard.classList.remove('card-flash-highlight');
      void groundedCard.offsetWidth; // trigger reflow
      groundedCard.classList.add('card-flash-highlight');
    }
    if (speculativeBlock) {
      speculativeBlock.classList.remove('speculative-flash-highlight');
      void speculativeBlock.offsetWidth; // trigger reflow
      speculativeBlock.classList.add('speculative-flash-highlight');
    }

    // Show dynamic explanation toast
    const explanation = route === 'route-b'
      ? "Pivot Applied: Draft rewritten to focus on Qualitative/Pricing signal. Paradox resolved!"
      : "Baseline Reverted: Restored baseline onboarding wizard draft (paradox active).";
    showToast(explanation);

    if (typeof OnboardingTour !== 'undefined') OnboardingTour.onPivotApplied();
    AuditHistory.refresh();
  }

  async function handleScenarioSwitch(id) {
    if (SheetController.isSheetOpen()) SheetController.close(false);
    GeminiClient.cancel();

    const scenario = await ScenarioStore.switchScenario(id);
    const { catalog } = ScenarioStore.getActive();
    ScenarioRenderer.renderAll(scenario, ScenarioStore.getAllSources());
    ProjectSwitcher.render(catalog, id);
    Router.goToIngestion();
    resetGenerateButton();
  }

  async function handleFileUpload(fileList) {
    if (!fileList?.length) return;

    ScreenIngestion.showIngestStatus('Verifying sources…');

    try {
      const result = await IngestionService.ingestFiles(fileList);
      const { scenario, id } = ScenarioStore.getActive();

      if (result.verified?.length) {
        ScenarioStore.addExtraSources(result.verified);
      }
      if (result.contextWindow) {
        ScenarioStore.setContextWindow(result.contextWindow);
      } else if (result.contextStatus) {
        scenario.contextStatus = result.contextStatus;
      }

      ScenarioRenderer.renderAll(scenario, ScenarioStore.getAllSources());

      let msg = result.rejected?.length
        ? `${result.verified.length} verified, ${result.rejected.length} rejected`
        : `${result.verified.length} source(s) verified`;
      if (result.piiRedactions) msg += ` · ${result.piiRedactions} PII redacted`;
      ScreenIngestion.showIngestStatus(msg);
      if (result.piiRedactions) ScreenIngestion.showPiiNotice(result.piiRedactions);

      AuditClient.logIngestion(id, result.verified?.length || 0, result.piiRedactions || 0);
    } catch (err) {
      ScreenIngestion.showIngestStatus(`Ingestion failed: ${err.message}`);
    }
  }

  function showToast(message) {
    const toast = document.getElementById('audit-toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 2500);
  }

  function bindRouteSelection() {
    document.getElementById('route-options')?.addEventListener('change', (e) => {
      if (e.target.name === 'route') state.selectedRoute = e.target.value;
    });
  }

  function bindNavigation() {
    document.getElementById('btn-generate-framework')?.addEventListener('click', handleGenerateFramework);

    document.getElementById('btn-back')?.addEventListener('click', () => {
      if (SheetController.isSheetOpen()) SheetController.close(false);
      if (state.isGenerating) GeminiClient.cancel();
      Router.goToIngestion();
      resetGenerateButton();
    });

    document.getElementById('paradox-badge')?.addEventListener('click', () => {
      SheetController.open();
    });

    document.getElementById('file-upload')?.addEventListener('change', (e) => {
      handleFileUpload(e.target.files);
      e.target.value = '';
    });

    document.getElementById('btn-load-samples')?.addEventListener('click', handleLoadSamples);
    document.getElementById('btn-verify-sql')?.addEventListener('click', handleVerifySql);
  }

  async function handleLoadSamples() {
    ScreenIngestion.showIngestStatus('Loading sample sources…');
    try {
      const result = await SampleSources.ingestSamples();
      const { scenario, id } = ScenarioStore.getActive();
      if (result.verified?.length) ScenarioStore.addExtraSources(result.verified);
      if (result.contextWindow) ScenarioStore.setContextWindow(result.contextWindow);
      else if (result.contextStatus) scenario.contextStatus = result.contextStatus;
      ScenarioRenderer.renderAll(scenario, ScenarioStore.getAllSources());
      ScreenIngestion.showIngestStatus('Sample sources loaded from Problem Statement');
      if (result.piiRedactions) ScreenIngestion.showPiiNotice(result.piiRedactions);
      AuditClient.logIngestion(id, result.verified?.length || 0, result.piiRedactions || 0);
      if (typeof OnboardingTour !== 'undefined') OnboardingTour.onAction('load-samples');
    } catch (err) {
      ScreenIngestion.showIngestStatus(`Failed: ${err.message}`);
    }
  }

  async function handleVerifySql() {
    ScreenIngestion.showIngestStatus('Verifying SQL ground truth…');
    try {
      const result = await DatabaseConnect.verifySampleSql();
      const { scenario, id } = ScenarioStore.getActive();

      if (result.verified?.length) {
        ScenarioStore.addExtraSources(result.verified);
      }
      if (result.grounding) {
        scenario.contextStatus = {
          label: result.grounding.label,
          grounded: result.grounding.grounded,
        };
      }

      ScenarioRenderer.renderAll(scenario, ScenarioStore.getAllSources());
      ScreenIngestion.showIngestStatus(result.grounding?.label || 'SQL verified');
      AuditClient.logIngestion(id, 1, 0);
      if (typeof OnboardingTour !== 'undefined') OnboardingTour.onAction('verify-sql');
    } catch (err) {
      ScreenIngestion.showIngestStatus(`SQL verify failed: ${err.message}`);
    }
  }

  function handleDraftEdit(text) {
    ScenarioStore.updateDraft({ groundedParagraph: text });
  }

  function resetGenerateButton() {
    const btn = document.getElementById('btn-generate-framework');
    if (btn) {
      btn.disabled = false;
      const { scenario } = ScenarioStore.getActive();
      const shortName = scenario?.project?.title?.replace('Project: ', '') || 'Churn';
      const btnText = btn.querySelector('span:first-child');
      if (btnText) btnText.textContent = `Generate ${shortName} Framework →`;
    }
    state.isGenerating = false;
    ScreenDraft.showStreaming(false);
  }

  async function init() {
    DesignSystem.init();
    InteractionController.init();

    ScreenIngestion.init();
    ScreenDraft.init({ onEditSave: handleDraftEdit });
    SheetConfession.init();
    ProgressTracker.init();
    AuditHistory.init();

    const scenario = await ScenarioStore.init();
    const { catalog, id } = ScenarioStore.getActive();

    Router.init();
    SheetController.init({ onApply: handleApplyPivot });
    ProjectSwitcher.init(handleScenarioSwitch);
    ProjectSwitcher.render(catalog, id);

    ScenarioRenderer.renderAll(scenario, ScenarioStore.getAllSources());
    bindRouteSelection();
    bindNavigation();

    const health = await GeminiClient.checkHealth();
    const badge = document.getElementById('gemini-status');
    if (badge && health.geminiConfigured) {
      badge.textContent = 'Gemini ready';
      badge.style.display = 'inline-block';
    }

    if (scenario._appliedRoute) {
      const result = PivotEngine.applyPivot(scenario, scenario._appliedRoute);
      ScreenDraft.renderDraft(result.draft, result.showParadox);
      const routeLabel = scenario.confession.routes.find((r) => r.id === scenario._appliedRoute)?.label;
      if (routeLabel) ScreenDraft.showPivotApplied(routeLabel);
    }

    if (!localStorage.getItem('socratic-editor-visited')) {
      document.getElementById('first-time-hint')?.classList.remove('hidden');
    }
    if (typeof OnboardingTour !== 'undefined') OnboardingTour.init();
  }

  return { init, getState: () => ({ ...state }) };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
