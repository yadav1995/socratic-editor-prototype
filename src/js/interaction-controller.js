/**
 * Interaction controller — Architecture §6.1 event flow (Phase 6)
 */
const InteractionController = (() => {
  function init() {
    InteractionState.subscribe(onStateChange);

    document.addEventListener('keydown', (e) => {
      const s = InteractionState.get();

      if (e.key === 'Enter' && s.sheetOpen && s.sheetPhase === 'open') {
        const applyBtn = document.getElementById('btn-apply-pivot');
        if (applyBtn && document.activeElement?.closest('#sheet-panel')) {
          e.preventDefault();
          applyBtn.click();
        }
      }
    });
  }

  function onStateChange(s) {
    document.body.dataset.screen = s.currentScreen;
    document.body.dataset.sheetPhase = s.sheetPhase;
    document.body.dataset.editingDraft = s.isEditingDraft ? 'true' : 'false';
  }

  function onNavigate(screenId) {
    InteractionState.set({ currentScreen: screenId });
  }

  function onSheetPhaseChange(phase) {
    InteractionState.set({
      sheetPhase: phase,
      sheetOpen: phase === 'open' || phase === 'opening',
    });
  }

  return { init, onNavigate, onSheetPhaseChange };
})();
