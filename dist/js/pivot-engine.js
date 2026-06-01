/**
 * Pivot engine — mutates draft content on structural pivot (Phase 1.1 / 3).
 */
const PivotEngine = (() => {
  function applyPivot(scenario, routeId) {
    const variant = scenario.pivotVariants?.[routeId];
    if (!variant) return scenario.draft;

    const draft = {
      groundedParagraph: variant.groundedParagraph,
      speculativeParagraph: variant.speculativeParagraph,
      paradoxBadgeLabel: scenario.draft.paradoxBadgeLabel,
    };

    scenario.draft = draft;
    scenario._appliedRoute = routeId;
    scenario._showParadox = variant.showParadox !== false;

    return { draft, showParadox: scenario._showParadox };
  }

  function renderDraftUI(draft, showParadox) {
    const groundedEl = document.getElementById('draft-grounded');
    const speculativeEl = document.getElementById('draft-speculative');
    const paradoxSection = document.getElementById('paradox-section');
    const speculativeBlock = document.getElementById('speculative-block');

    if (groundedEl) groundedEl.textContent = draft.groundedParagraph;
    if (speculativeEl) speculativeEl.textContent = draft.speculativeParagraph;

    if (paradoxSection) {
      paradoxSection.classList.toggle('hidden', !showParadox);
    }

    if (speculativeBlock) {
      speculativeBlock.className = DesignSystem.speculativeBlockClass(showParadox);
    }
  }

  function showStreamingState(isStreaming) {
    const cursor = document.getElementById('stream-cursor');
    const status = document.getElementById('generation-status');
    if (cursor) cursor.classList.toggle('hidden', !isStreaming);
    if (status) status.classList.toggle('hidden', !isStreaming);
  }

  function appendStreamToken(targetId, token) {
    const el = document.getElementById(targetId);
    if (el) el.textContent += token;
  }

  function clearDraftUI() {
    ['draft-grounded', 'draft-speculative'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = '';
    });
  }

  return { applyPivot, renderDraftUI, showStreamingState, appendStreamToken, clearDraftUI };
})();
