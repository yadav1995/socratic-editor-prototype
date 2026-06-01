/**
 * Screen 2 — Honest Draft (§5.3) + passive edit mode (§6.1 Phase 6)
 */
const ScreenDraft = (() => {
  const els = {};
  let onEditSave = null;
  let editEnabled = false;

  function cacheElements() {
    els.title = document.getElementById('draft-title');
    els.grounded = document.getElementById('draft-grounded');
    els.speculative = document.getElementById('draft-speculative');
    els.paradoxSection = document.getElementById('paradox-section');
    els.paradoxBadge = document.getElementById('paradox-badge');
    els.speculativeBlock = document.getElementById('speculative-block');
    els.generationStatus = document.getElementById('generation-status');
    els.streamCursor = document.getElementById('stream-cursor');
    els.pivotApplied = document.getElementById('pivot-applied-notice');
    els.editHint = document.getElementById('draft-edit-hint');
  }

  function enableEditMode(saveCallback) {
    onEditSave = saveCallback;
    editEnabled = true;
    if (!els.grounded) return;

    els.grounded.contentEditable = 'true';
    els.grounded.classList.add('ds-body-grounded--editable');
    els.grounded.setAttribute('role', 'textbox');
    els.grounded.setAttribute('aria-label', 'Grounded analysis paragraph');

    els.grounded.addEventListener('focus', onEditFocus);
    els.grounded.addEventListener('blur', onEditBlur);

    if (els.editHint) els.editHint.classList.remove('hidden');
  }

  function onEditFocus() {
    InteractionState.set({ isEditingDraft: true });
    els.grounded?.classList.add('ds-body-grounded--editing');
  }

  function onEditBlur() {
    InteractionState.set({ isEditingDraft: false });
    els.grounded?.classList.remove('ds-body-grounded--editing');
    if (onEditSave && els.grounded) {
      onEditSave(els.grounded.textContent.trim());
    }
  }

  function renderTitle(scenario) {
    if (els.title) {
      els.title.textContent = scenario.project.title.replace('Project: ', '') + ' Framework Draft';
      els.title.className = 'ds-screen-title';
      els.title.style.fontSize = '1rem';
    }
  }

  function renderDraft(draft, showParadox) {
    if (els.grounded) {
      els.grounded.textContent = draft.groundedParagraph || '';
      els.grounded.className = `ds-body-grounded${editEnabled ? ' ds-body-grounded--editable' : ''}`;
    }
    if (els.speculative) {
      els.speculative.textContent = draft.speculativeParagraph || '';
      els.speculative.className = 'ds-body-speculative';
    }
    if (els.paradoxBadge) {
      const badgeText = els.paradoxBadge.querySelector('span');
      if (badgeText) {
        badgeText.textContent = draft.paradoxBadgeLabel || 'Data Paradox · Tap to inspect';
      }
      els.paradoxBadge.className = 'ds-paradox-badge paradox-badge paradox-badge-pulse';
    }

    if (els.paradoxSection) els.paradoxSection.classList.toggle('hidden', !showParadox);

    if (els.speculativeBlock) {
      els.speculativeBlock.className = DesignSystem.speculativeBlockClass(showParadox);
    }
  }

  function showStreaming(active) {
    if (els.generationStatus) els.generationStatus.classList.toggle('hidden', !active);
    if (els.streamCursor) els.streamCursor.classList.toggle('hidden', !active);
  }

  function showPivotApplied(routeLabel) {
    if (!els.pivotApplied) return;
    els.pivotApplied.textContent = `Structural pivot applied: ${routeLabel}`;
    els.pivotApplied.classList.remove('hidden');
    els.pivotApplied.classList.add('pivot-applied-animate');
  }

  function clearDraft() {
    if (els.grounded) els.grounded.textContent = '';
    if (els.speculative) els.speculative.textContent = '';
  }

  function init(options = {}) {
    cacheElements();
    enableEditMode(options.onEditSave);
  }

  return { init, renderTitle, renderDraft, showStreaming, showPivotApplied, clearDraft };
})();
