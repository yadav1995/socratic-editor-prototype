/**
 * Screen 3 — Socratic Confession sheet component (Architecture §5.4 / Phase 5).
 */
const SheetConfession = (() => {
  const els = {};

  function cacheElements() {
    els.title = document.getElementById('sheet-title');
    els.confessionText = document.getElementById('confession-text');
    els.routeOptions = document.getElementById('route-options');
    els.applyBtn = document.getElementById('btn-apply-pivot');
    els.paradoxMeta = document.getElementById('paradox-meta');
  }

  function renderConfession(confession) {
    if (els.title) els.title.textContent = confession.title;
    if (els.confessionText) els.confessionText.textContent = confession.metaCommentary;
    if (els.applyBtn) els.applyBtn.textContent = confession.applyButtonLabel || 'Apply Structural Pivot';
  }

  function renderRoutes(routes, appliedRoute) {
    if (!els.routeOptions) return;

    els.routeOptions.innerHTML = routes.map((route) => `
      <label class="route-option">
        <input
          type="radio"
          name="route"
          id="${route.id}"
          value="${route.id}"
          class="route-radio"
          ${(appliedRoute === route.id || (route.recommended && !appliedRoute)) ? 'checked' : ''}
        >
        <span class="route-label">${route.label}</span>
      </label>
    `).join('');
  }

  function renderParadoxMeta(paradox) {
    if (!els.paradoxMeta || !paradox?.hasParadox) return;
    els.paradoxMeta.textContent = `Detector confidence: ${Math.round(paradox.confidence * 100)}% — ${paradox.reason}`;
    els.paradoxMeta.classList.remove('hidden');
  }

  function render(scenario, paradox) {
    renderConfession(scenario.confession);
    renderRoutes(scenario.confession.routes, scenario._appliedRoute);
    renderParadoxMeta(paradox);
  }

  function init() {
    cacheElements();
  }

  return { init, render, renderConfession, renderRoutes, renderParadoxMeta };
})();
