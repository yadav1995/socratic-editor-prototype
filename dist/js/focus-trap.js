/**
 * Focus trap for modal sheets (Architecture §10 / Phase 5).
 */
const FocusTrap = (() => {
  let container = null;
  let handler = null;

  function getFocusableElements(root) {
    return Array.from(root.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter((el) => el.offsetParent !== null || el === document.activeElement);
  }

  function trap(root) {
    release();
    container = root;
    handler = (e) => {
      if (e.key !== 'Tab' || !container) return;
      const focusable = getFocusableElements(container);
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handler);
  }

  function release() {
    if (handler) document.removeEventListener('keydown', handler);
    container = null;
    handler = null;
  }

  return { trap, release, getFocusableElements };
})();
