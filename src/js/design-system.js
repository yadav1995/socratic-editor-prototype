/**
 * Design System API — Gemini Mobile App Replica
 */
const DesignSystem = (() => {
  const TOKENS = {
    canvas: 'ds-canvas',
    surface: 'ds-surface',
    screenTitle: 'ds-screen-title',
    subLabel: 'ds-sub-label',
    bodyGrounded: 'ds-body-grounded',
    bodySpeculative: 'ds-body-speculative',
    paradoxBadge: 'ds-paradox-badge',
    speculativeBlock: 'ds-speculative-block',
    speculativeResolved: 'ds-speculative-resolved',
    ctaPrimary: 'ds-cta-primary',
    successBadge: 'ds-success-badge',
    card: 'ds-card',
    sheetTitle: 'ds-sheet-title',
  };

  const AMBER_ALLOWED_IDS = new Set([
    'paradox-badge',
    'paradox-section',
    'speculative-block',
    'draft-speculative',
  ]);

  function speculativeBlockClass(showParadox) {
    return showParadox ? TOKENS.speculativeBlock : TOKENS.speculativeResolved;
  }

  /** Dev guard: warn if amber/warning classes used outside paradox elements */
  function auditAmberUsage(root = document.getElementById('device-shell')) {
    if (!root) return [];
    const violations = [];
    root.querySelectorAll('[class*="warning"], [class*="paradox"]').forEach((el) => {
      const allowed = [...AMBER_ALLOWED_IDS].some((id) => el.id === id || el.closest(`#${id}`));
      if (!allowed && !el.closest('#paradox-section')) {
        violations.push(el);
      }
    });
    return violations;
  }

  function init() {
    if (typeof console !== 'undefined' && console.debug) {
      const violations = auditAmberUsage();
      if (violations.length) {
        console.debug('[DesignSystem] Warning usage outside paradox:', violations);
      }
    }
  }

  return { TOKENS, speculativeBlockClass, auditAmberUsage, init };
})();
