/**
 * Screen 1 — Ingestion Overview component (Architecture §5.2 / Phase 5).
 * Gemini Mobile App style.
 */
const ScreenIngestion = (() => {
  const els = {};

  function cacheElements() {
    els.title = document.getElementById('project-title');
    els.groundTruthList = document.getElementById('ground-truth-list');
    els.contextBadge = document.getElementById('context-badge');
    els.contextBadgeLabel = document.getElementById('context-badge-label');
    els.contextWindow = document.getElementById('context-window-info');
    els.ingestStatus = document.getElementById('ingest-status');
    els.generateBtn = document.getElementById('btn-generate-framework');
    els.piiNotice = document.getElementById('pii-notice');
  }

  function renderGroundTruth(sources) {
    if (!els.groundTruthList) return;
    const icons = {
      document: '<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />',
      database: '<path stroke-linecap="round" stroke-linejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />',
    };

    els.groundTruthList.innerHTML = sources.map((item) => `
      <li class="source-item">
        <span class="source-icon" aria-hidden="true">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">${icons[item.icon] || icons.document}</svg>
        </span>
        <span class="source-name">${item.name}</span>
      </li>
    `).join('');
  }

  function render(scenario, sources, contextWindow) {
    if (els.title) els.title.textContent = scenario.project.title.replace('Project: ', '') + ' ▾';

    const shortName = scenario.project.title.replace('Project: ', '');
    if (els.generateBtn) {
      const btnText = els.generateBtn.querySelector('span:first-child');
      if (btnText) btnText.textContent = `Generate ${shortName} Framework →`;
      else els.generateBtn.textContent = `Generate ${shortName} Framework →`;
    }

    const label = contextWindow?.label || scenario.contextStatus.label;
    if (els.contextBadgeLabel) els.contextBadgeLabel.textContent = label;

    const grounded = contextWindow?.active ?? scenario.contextStatus.grounded;
    if (els.contextBadge) {
      if (!grounded) {
        els.contextBadge.style.color = 'var(--g-text-secondary)';
        els.contextBadge.style.background = 'var(--g-surface)';
        els.contextBadge.style.borderColor = 'transparent';
      } else {
        els.contextBadge.style.color = '';
        els.contextBadge.style.background = '';
        els.contextBadge.style.borderColor = '';
      }
    }

    if (els.contextWindow && contextWindow) {
      els.contextWindow.textContent = `${contextWindow.utilizationPct}% of 2M token window used`;
      els.contextWindow.classList.remove('hidden');
    }

    renderGroundTruth(sources);
  }

  function showIngestStatus(message) {
    if (!els.ingestStatus) return;
    els.ingestStatus.textContent = message;
    els.ingestStatus.classList.remove('hidden');
  }

  function showPiiNotice(count) {
    if (!els.piiNotice || !count) return;
    els.piiNotice.textContent = `${count} PII field(s) redacted before grounding`;
    els.piiNotice.classList.remove('hidden');
  }

  function init() {
    cacheElements();
  }

  return { init, render, showIngestStatus, showPiiNotice };
})();
