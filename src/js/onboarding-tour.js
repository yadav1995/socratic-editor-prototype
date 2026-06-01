/**
 * Onboarding Tour — Interactive step-by-step guided product tour.
 */
const OnboardingTour = (() => {
  const STEPS = [
    {
      targetId: 'logo-trigger',
      text: '✦ Welcome to Socratic Editor! Click this title to switch between projects (e.g., Churn, Onboarding Funnels).',
      placement: 'bottom',
      screen: 'ingestion'
    },
    {
      targetId: 'btn-load-samples',
      text: '1. Ingest Data: Click "Load Samples" to ingest Qualitative user surveys and check context window capacity.',
      placement: 'bottom',
      screen: 'ingestion'
    },
    {
      targetId: 'btn-verify-sql',
      text: '2. Verify SQL: Click "Verify SQL" to verify database schema references and ensure context grounding.',
      placement: 'bottom',
      screen: 'ingestion'
    },
    {
      targetId: 'btn-generate-framework',
      text: '3. Generate Framework: Tap this bottom prompt bar to generate and stream the analytical framework draft.',
      placement: 'top',
      screen: 'ingestion'
    },
    {
      targetId: 'draft-grounded',
      text: '4. Passive Edit: Tapping directly on the Grounded Analysis paragraph lets you edit facts in real-time.',
      placement: 'bottom',
      screen: 'draft'
    },
    {
      targetId: 'paradox-badge',
      text: '5. Inspect Conflict: The AI detected a paradox. Tap the warning badge to view the Socratic Confession.',
      placement: 'top',
      screen: 'draft'
    },
    {
      targetId: 'btn-apply-pivot',
      text: '6. Apply Pivot: Select Route B (Recommended) and click this button to rewrite the draft and resolve the paradox.',
      placement: 'top',
      screen: 'draft',
      checkSheetOpen: true
    },
    {
      targetId: 'btn-audit-history',
      text: '7. Audit Trail: All decisions are stored securely. Click this clock icon to view the Decision History log.',
      placement: 'bottom',
      screen: 'ingestion'
    }
  ];

  let currentStepIndex = -1;
  let active = false;
  let highlightedEl = null;

  function init() {
    document.getElementById('tour-next')?.addEventListener('click', next);
    document.getElementById('tour-prev')?.addEventListener('click', prev);
    document.getElementById('tour-skip')?.addEventListener('click', end);

    // Only start if not visited yet
    if (!localStorage.getItem('socratic-editor-visited') || localStorage.getItem('socratic-editor-tour-force')) {
      start();
    }
  }

  function start() {
    active = true;
    currentStepIndex = 0;
    showStep(0);
    // Dismiss first-time title hint since we are starting the guided tour
    document.getElementById('first-time-hint')?.classList.add('hidden');
  }

  function showStep(index) {
    if (!active) return;
    if (index < 0 || index >= STEPS.length) {
      end();
      return;
    }

    const step = STEPS[index];
    const targetEl = document.getElementById(step.targetId);

    // If step requires draft screen, switch to it (simulate or wait)
    const currentScreen = Router.getCurrentScreen();
    if (step.screen && currentScreen !== step.screen) {
      // Avoid rendering on incorrect screen
      if (step.screen === 'ingestion') Router.goToIngestion();
      else if (step.screen === 'draft') Router.goToDraft();
    }

    // If step requires bottom sheet to be open but it isn't, delay step
    if (step.checkSheetOpen && !SheetController.isSheetOpen()) {
      return;
    }

    // Clean up previous highlight
    if (highlightedEl) {
      highlightedEl.classList.remove('tour-highlight');
    }

    if (targetEl) {
      targetEl.classList.add('tour-highlight');
      highlightedEl = targetEl;

      const bubble = document.getElementById('tour-bubble');
      const textEl = document.getElementById('tour-text');
      const progressEl = document.getElementById('tour-progress');
      const prevBtn = document.getElementById('tour-prev');
      const nextBtn = document.getElementById('tour-next');

      if (bubble && textEl) {
        textEl.textContent = step.text;
        if (progressEl) progressEl.textContent = `${index + 1} / ${STEPS.length}`;
        if (prevBtn) prevBtn.style.display = index === 0 ? 'none' : 'inline-block';
        if (nextBtn) nextBtn.textContent = index === STEPS.length - 1 ? 'Finish' : 'Next';

        bubble.classList.remove('hidden');
        positionBubble(targetEl, step.placement);
      }
    } else {
      // Target not found, skip to next
      next();
    }
  }

  function positionBubble(targetEl, placement) {
    const bubble = document.getElementById('tour-bubble');
    if (!bubble || !targetEl) return;

    const rect = targetEl.getBoundingClientRect();
    const viewportRect = document.getElementById('app-viewport').getBoundingClientRect();

    // Coordinates relative to the app-viewport container
    const top = rect.top - viewportRect.top;
    const left = rect.left - viewportRect.left;
    const height = rect.height;
    const width = rect.width;

    bubble.classList.remove('tour-bubble-bottom', 'tour-bubble-top');

    // Handle placement positioning
    if (placement === 'bottom') {
      bubble.style.top = `${top + height + 10}px`;
      bubble.style.left = `${left + width / 2 - 130}px`;
      bubble.classList.add('tour-bubble-bottom');
    } else {
      bubble.style.top = `${top - bubble.offsetHeight - 12}px`;
      bubble.style.left = `${left + width / 2 - 130}px`;
      bubble.classList.add('tour-bubble-top');
    }

    // Restrict within app-viewport boundaries
    const bubbleLeft = parseFloat(bubble.style.left);
    if (bubbleLeft < 10) bubble.style.left = '10px';
    if (bubbleLeft > viewportRect.width - 270) {
      bubble.style.left = `${viewportRect.width - 270}px`;
    }
  }

  function next() {
    currentStepIndex++;
    if (currentStepIndex >= STEPS.length) {
      end();
    } else {
      showStep(currentStepIndex);
    }
  }

  function prev() {
    currentStepIndex--;
    if (currentStepIndex < 0) {
      currentStepIndex = 0;
    } else {
      showStep(currentStepIndex);
    }
  }

  function end() {
    active = false;
    currentStepIndex = -1;
    if (highlightedEl) {
      highlightedEl.classList.remove('tour-highlight');
      highlightedEl = null;
    }
    document.getElementById('tour-bubble')?.classList.add('hidden');
    localStorage.setItem('socratic-editor-visited', 'true');
    localStorage.removeItem('socratic-editor-tour-force');
  }

  // Event hooks to align steps with user actions
  function onAction(actionId) {
    if (!active) return;
    
    // Auto-advance if they do the correct action
    if (actionId === 'load-samples' && currentStepIndex === 1) {
      next();
    } else if (actionId === 'verify-sql' && currentStepIndex === 2) {
      next();
    }
  }

  function onGenerate() {
    if (!active) return;
    if (currentStepIndex === 3) {
      // Advance to step 4 (passive edit) when screen draft loads
      currentStepIndex = 4;
      setTimeout(() => showStep(4), 100);
    }
  }

  function onSheetOpen() {
    if (!active) return;
    if (currentStepIndex === 5) {
      // Advance to step 6 (apply pivot) when bottom sheet shows
      currentStepIndex = 6;
      setTimeout(() => showStep(6), 350); // wait for sheet transition
    }
  }

  function onPivotApplied() {
    if (!active) return;
    if (currentStepIndex === 6) {
      // Advance to step 7 (audit log) when pivot completes
      currentStepIndex = 7;
      setTimeout(() => showStep(7), 400); // wait for sheet close
    }
  }

  function isActive() {
    return active;
  }

  return { init, start, next, prev, end, onAction, onGenerate, onSheetOpen, onPivotApplied, isActive };
})();
