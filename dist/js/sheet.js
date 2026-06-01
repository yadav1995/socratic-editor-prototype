/**
 * Bottom sheet — §6.2 states: closed | opening | open | closing (Phase 6)
 */
const SheetController = (() => {
  let backdrop = null;
  let panel = null;
  let applyBtn = null;
  let dragHandle = null;
  let phase = 'closed';
  let previousFocus = null;
  let onClose = null;
  let onApply = null;
  let dragStartY = 0;
  let dragCurrentY = 0;
  let isDragging = false;
  let closeTimer = null;

  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SHEET_MS = REDUCED_MOTION ? 0 : 300;

  function init(options = {}) {
    backdrop = document.getElementById('sheet-backdrop');
    panel = document.getElementById('sheet-panel');
    applyBtn = document.getElementById('btn-apply-pivot');
    dragHandle = document.getElementById('sheet-drag-handle');
    onClose = options.onClose || null;
    onApply = options.onApply || null;

    backdrop?.addEventListener('click', () => close(false));
    dragHandle?.addEventListener('click', () => close(false));
    applyBtn?.addEventListener('click', () => {
      if (onApply) onApply();
      close(true);
    });

    bindDragGestures();

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && phase === 'open') close(false);
    });
  }

  function setPhase(next) {
    phase = next;
    InteractionController.onSheetPhaseChange(next);

    panel?.classList.remove('sheet-panel-closed', 'sheet-panel-opening', 'sheet-panel-open', 'sheet-panel-closing');
    backdrop?.classList.remove('sheet-backdrop-closed', 'sheet-backdrop-open');

    if (next === 'closed') {
      panel?.classList.add('sheet-panel-closed');
      backdrop?.classList.add('sheet-backdrop-closed');
      backdrop?.setAttribute('aria-hidden', 'true');
    } else if (next === 'opening') {
      panel?.classList.add('sheet-panel-opening');
      backdrop?.classList.add('sheet-backdrop-open');
      backdrop?.removeAttribute('aria-hidden');
    } else if (next === 'open') {
      panel?.classList.add('sheet-panel-open');
      backdrop?.classList.add('sheet-backdrop-open');
      backdrop?.removeAttribute('aria-hidden');
    } else if (next === 'closing') {
      panel?.classList.add('sheet-panel-closing');
      backdrop?.classList.add('sheet-backdrop-open');
    }
  }

  function bindDragGestures() {
    const startDrag = (clientY) => {
      if (phase !== 'open') return;
      isDragging = true;
      dragStartY = clientY;
      dragCurrentY = 0;
      panel.style.transition = 'none';
    };

    const moveDrag = (clientY) => {
      if (!isDragging) return;
      dragCurrentY = Math.max(0, clientY - dragStartY);
      panel.style.transform = `translateY(${dragCurrentY}px)`;
    };

    const endDrag = () => {
      if (!isDragging) return;
      isDragging = false;
      panel.style.transition = '';
      if (dragCurrentY > 80) close(false);
      else panel.style.transform = '';
    };

    dragHandle?.addEventListener('touchstart', (e) => startDrag(e.touches[0].clientY), { passive: true });
    dragHandle?.addEventListener('touchmove', (e) => moveDrag(e.touches[0].clientY), { passive: true });
    dragHandle?.addEventListener('touchend', endDrag);
    dragHandle?.addEventListener('mousedown', (e) => startDrag(e.clientY));
    document.addEventListener('mousemove', (e) => { if (isDragging) moveDrag(e.clientY); });
    document.addEventListener('mouseup', endDrag);
  }

  function open() {
    if (phase === 'open' || phase === 'opening') return;
    previousFocus = document.activeElement;

    setPhase('opening');
    requestAnimationFrame(() => setPhase('open'));

    if (panel) FocusTrap.trap(panel);
    ProgressTracker.onSheetOpen();
    applyBtn?.focus();
    if (typeof OnboardingTour !== 'undefined') OnboardingTour.onSheetOpen();
  }

  function close(applied = false) {
    if (phase === 'closed' || phase === 'closing') return;

    FocusTrap.release();
    setPhase('closing');

    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => {
      setPhase('closed');
      panel.style.transform = '';
      ProgressTracker.onSheetClose(applied);

      if (previousFocus && typeof previousFocus.focus === 'function') {
        previousFocus.focus();
      }
      if (onClose) onClose(applied);
    }, SHEET_MS);
  }

  function isSheetOpen() {
    return phase === 'open' || phase === 'opening';
  }

  function getPhase() {
    return phase;
  }

  return { init, open, close, isSheetOpen, getPhase };
})();
