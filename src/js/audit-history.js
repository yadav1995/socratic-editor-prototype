/**
 * Audit history UI — human override decision log (Phase 6 / §6.1)
 */
const AuditHistory = (() => {
  let panel = null;
  let backdrop = null;
  let isOpen = false;

  function init() {
    panel = document.getElementById('audit-history-panel');
    backdrop = document.getElementById('audit-history-backdrop');
    document.getElementById('btn-audit-history')?.addEventListener('click', open);
    backdrop?.addEventListener('click', close);
    document.getElementById('audit-history-close')?.addEventListener('click', close);
  }

  async function fetchEntries() {
    try {
      const res = await fetch('/api/audit');
      if (!res.ok) return [];
      const data = await res.json();
      return data.entries || [];
    } catch {
      return [];
    }
  }

  function formatEntry(entry) {
    const time = new Date(entry.timestamp).toLocaleString();
    const actionLabels = {
      structural_pivot: 'Structural Pivot',
      draft_generated: 'Draft Generated',
      sources_ingested: 'Sources Ingested',
    };
    const label = actionLabels[entry.action] || entry.action;
    const detail = entry.routeId
      ? `Route: ${entry.routeId}`
      : entry.metadata?.mode
        ? `Mode: ${entry.metadata.mode}`
        : entry.metadata?.sourceCount != null
          ? `${entry.metadata.sourceCount} source(s)`
          : '';
    return { time, label, detail, scenarioId: entry.scenarioId };
  }

  async function render() {
    const list = document.getElementById('audit-history-list');
    if (!list) return;

    const entries = await fetchEntries();
    if (!entries.length) {
      list.innerHTML = '<p style="font-size: var(--ds-font-sub-label); color: var(--ds-text-tertiary); text-align: center; padding: 2rem 0;">No decisions logged yet.</p>';
      return;
    }

    list.innerHTML = entries.map((entry) => {
      const { time, label, detail, scenarioId } = formatEntry(entry);
      return `
        <li class="audit-entry">
          <p class="audit-entry-label">${label}</p>
          <p class="audit-entry-time">${time}</p>
          ${scenarioId ? `<p class="audit-entry-time">${scenarioId}</p>` : ''}
          ${detail ? `<p class="audit-entry-detail">${detail}</p>` : ''}
        </li>
      `;
    }).join('');
  }

  function open() {
    if (isOpen) return;
    isOpen = true;
    InteractionState.set({ auditPanelOpen: true });
    backdrop?.classList.remove('audit-panel-backdrop-closed');
    backdrop?.classList.add('audit-panel-backdrop-open');
    panel?.classList.remove('audit-panel-closed');
    panel?.classList.add('audit-panel-open');
    render();
    if (panel) FocusTrap.trap(panel);
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    InteractionState.set({ auditPanelOpen: false });
    FocusTrap.release();
    backdrop?.classList.remove('audit-panel-backdrop-open');
    backdrop?.classList.add('audit-panel-backdrop-closed');
    panel?.classList.remove('audit-panel-open');
    panel?.classList.add('audit-panel-closed');
  }

  return { init, open, close, refresh: render };
})();
