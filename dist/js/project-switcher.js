/**
 * Project switcher — multi-scenario UI (Phase 3).
 */
const ProjectSwitcher = (() => {
  let sheet = null;
  let backdrop = null;
  let isOpen = false;
  let onSelect = null;

  function init(selectCallback) {
    onSelect = selectCallback;
    sheet = document.getElementById('switcher-panel');
    backdrop = document.getElementById('switcher-backdrop');

    document.getElementById('btn-project-switcher')?.addEventListener('click', open);
    document.getElementById('logo-trigger')?.addEventListener('click', open);
    backdrop?.addEventListener('click', close);
    document.getElementById('switcher-close')?.addEventListener('click', close);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen) close();
    });
  }

  function render(catalog, activeId) {
    const list = document.getElementById('project-list');
    if (!list) return;

    list.innerHTML = catalog.map((item) => `
      <button
        type="button"
        data-scenario-id="${item.id}"
        class="switcher-item ${item.id === activeId ? 'switcher-item--active' : ''}"
      >
        <span class="switcher-item-title">${item.title}</span>
        <span class="switcher-item-desc">${item.description || ''}</span>
      </button>
    `).join('');

    list.querySelectorAll('[data-scenario-id]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.scenarioId;
        if (id !== activeId && onSelect) await onSelect(id);
        close();
      });
    });
  }

  function open() {
    if (isOpen) return;
    isOpen = true;
    backdrop?.classList.remove('switcher-backdrop-closed');
    backdrop?.classList.add('switcher-backdrop-open');
    sheet?.classList.remove('switcher-panel-closed');
    sheet?.classList.add('switcher-panel-open');

    const hint = document.getElementById('first-time-hint');
    if (hint) {
      hint.classList.add('hidden');
      localStorage.setItem('socratic-editor-visited', 'true');
    }
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    backdrop?.classList.remove('switcher-backdrop-open');
    backdrop?.classList.add('switcher-backdrop-closed');
    sheet?.classList.remove('switcher-panel-open');
    sheet?.classList.add('switcher-panel-closed');
  }

  return { init, render, open, close };
})();
