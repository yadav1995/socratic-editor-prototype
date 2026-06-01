/**
 * Progress tracker — 3-step screen flow (Architecture §4 / Phase 5).
 * Steps: Ingest → Draft → Resolve
 */
const ProgressTracker = (() => {
  const STEPS = [
    { id: 'ingest', label: 'Ingest' },
    { id: 'draft', label: 'Draft' },
    { id: 'resolve', label: 'Resolve' },
  ];

  let currentStep = 'ingest';

  function render(containerId = 'progress-tracker') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const stepIndex = STEPS.findIndex((s) => s.id === currentStep);

    const parts = [];
    STEPS.forEach((step, i) => {
      const isActive = i === stepIndex;
      const isComplete = i < stepIndex;

      let dotClass = 'progress-dot';
      let labelClass = 'progress-label';

      if (isActive) {
        dotClass += ' progress-dot--active';
        labelClass += ' progress-label--active';
      } else if (isComplete) {
        dotClass += ' progress-dot--complete';
        labelClass += ' progress-label--complete';
      }

      parts.push(`
        <div class="progress-step" aria-current="${isActive ? 'step' : 'false'}">
          <span class="${dotClass}"></span>
          <span class="${labelClass}">${step.label}</span>
        </div>
      `);

      if (i < STEPS.length - 1) {
        const connectorClass = isComplete ? 'progress-connector progress-connector--active' : 'progress-connector';
        parts.push(`<span class="${connectorClass}"></span>`);
      }
    });

    container.innerHTML = parts.join('');
  }

  function setStep(stepId) {
    if (STEPS.some((s) => s.id === stepId)) {
      currentStep = stepId;
      render();
    }
  }

  function onScreenChange(screenId) {
    if (screenId === 'ingestion') setStep('ingest');
    else if (screenId === 'draft') setStep('draft');
  }

  function onSheetOpen() {
    setStep('resolve');
  }

  function onSheetClose(wasApplied) {
    if (wasApplied) setStep('resolve');
    else setStep('draft');
  }

  function init() {
    render();
  }

  return { init, setStep, onScreenChange, onSheetOpen, onSheetClose, STEPS };
})();
