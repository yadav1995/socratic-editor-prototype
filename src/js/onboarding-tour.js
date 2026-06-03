/**
 * Onboarding Tour — Premium Interactive guided product tour.
 */
const OnboardingTour = (() => {
  const STEPS = [
    {
      targetId: 'logo-trigger',
      title: 'Welcome to Socratic Editor',
      text: 'Tap here to switch between analysis projects (e.g. Churn, Onboarding Funnels) at any time.',
      placement: 'bottom',
      screen: 'ingestion'
    },
    {
      targetId: 'btn-load-samples',
      title: 'Step 1: Load Samples',
      text: 'Click "Load Samples" to automatically ingest exit surveys and upload qualitative inputs into the context window.',
      placement: 'bottom',
      screen: 'ingestion'
    },
    {
      targetId: 'btn-verify-sql',
      title: 'Step 2: Grounding Verification',
      text: 'Click "Verify SQL" to verify structural database schemas and ensure your analytical model is grounded in raw data.',
      placement: 'bottom',
      screen: 'ingestion'
    },
    {
      targetId: 'btn-generate-framework',
      title: 'Step 3: Stream Framework',
      text: 'Tap this Gemini-style bottom bar to run LLM streaming and generate your draft analytical framework.',
      placement: 'top',
      screen: 'ingestion'
    },
    {
      targetId: 'draft-grounded',
      title: 'Step 4: Live Editing',
      text: 'Tap any grounded paragraph to edit and update text in real-time, synchronizing with the model.',
      placement: 'bottom',
      screen: 'draft'
    },
    {
      targetId: 'paradox-badge',
      title: 'Step 5: Paradox Detected',
      text: 'The AI flagged a data paradox! Tap this pulsing warning badge to open the Socratic Confession bottom sheet.',
      placement: 'top',
      screen: 'draft'
    },
    {
      targetId: 'btn-apply-pivot',
      title: 'Step 6: Apply Pivot',
      text: 'Select Route B (Recommended) and tap this button to apply a structural pivot and automatically rewrite the draft.',
      placement: 'top',
      screen: 'draft',
      checkSheetOpen: true
    },
    {
      targetId: 'btn-audit-history',
      title: 'Step 7: Decision History',
      text: 'All user choices and model rewrites are logged. Click this clock icon to view the full Decision History audit trail.',
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
    document.getElementById('tour-close')?.addEventListener('click', end);

    // Reposition on scroll of either main screen container to prevent detachment
    const reposition = () => {
      if (!active || currentStepIndex === -1 || !highlightedEl) return;
      const step = STEPS[currentStepIndex];
      positionBubble(highlightedEl, step.placement);
    };

    document.getElementById('main-ingestion')?.addEventListener('scroll', reposition);
    document.getElementById('main-draft')?.addEventListener('scroll', reposition);

    // Only start if not visited yet
    if (!localStorage.getItem('socratic-editor-visited') || localStorage.getItem('socratic-editor-tour-force')) {
      start();
    }
  }

  function start() {
    active = true;
    currentStepIndex = 0;
    
    // Register global click blocker
    document.addEventListener('click', handleGlobalClick, true);

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

    // If step requires draft screen, switch to it
    const currentScreen = Router.getCurrentScreen();
    if (step.screen && currentScreen !== step.screen) {
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
      // Smooth scroll target into view
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

      targetEl.classList.add('tour-highlight');
      highlightedEl = targetEl;

      const bubble = document.getElementById('tour-bubble');
      const titleEl = document.getElementById('tour-title');
      const textEl = document.getElementById('tour-text');
      const prevBtn = document.getElementById('tour-prev');
      const nextBtn = document.getElementById('tour-next');
      const dotsContainer = document.getElementById('tour-dots');

      if (bubble) {
        if (titleEl) titleEl.textContent = step.title;
        if (textEl) textEl.textContent = step.text;
        
        // Render dots indicator
        if (dotsContainer) {
          dotsContainer.innerHTML = '';
          STEPS.forEach((_, idx) => {
            const dot = document.createElement('div');
            dot.className = `tour-dot ${idx === index ? 'tour-dot-active' : ''}`;
            dotsContainer.appendChild(dot);
          });
        }

        if (prevBtn) prevBtn.style.display = index === 0 ? 'none' : 'inline-block';
        if (nextBtn) {
          nextBtn.textContent = index === STEPS.length - 1 ? 'Finish' : 'Next';
          
          // Disable "Next" if currently generating
          const isGenerating = typeof App !== 'undefined' && App.getState()?.isGenerating;
          if (isGenerating && (index === 3 || index === 4)) {
            nextBtn.disabled = true;
            nextBtn.style.opacity = '0.5';
            nextBtn.style.cursor = 'not-allowed';
            nextBtn.textContent = 'Streaming…';
          } else {
            nextBtn.disabled = false;
            nextBtn.style.opacity = '1';
            nextBtn.style.cursor = 'pointer';
          }
        }

        bubble.classList.remove('hidden');

        // Position bubble after scroll finishes
        setTimeout(() => {
          if (active && currentStepIndex === index) {
            positionBubble(targetEl, step.placement);
          }
        }, 150);
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

    // Position bubble above or below target
    let bubbleTop = 0;
    let bubbleLeft = left + width / 2 - bubble.offsetWidth / 2;
    let actualPlacement = placement;

    if (placement === 'bottom') {
      bubbleTop = top + height + 10;
      // If it overflows the bottom of the viewport, try placing it at the top
      if (bubbleTop + bubble.offsetHeight > viewportRect.height - 10) {
        const altTop = top - bubble.offsetHeight - 12;
        if (altTop >= 10) {
          bubbleTop = altTop;
          actualPlacement = 'top';
        }
      }
    } else {
      bubbleTop = top - bubble.offsetHeight - 12;
      // If it overflows the top of the viewport, try placing it at the bottom
      if (bubbleTop < 10) {
        const altTop = top + height + 10;
        if (altTop + bubble.offsetHeight <= viewportRect.height - 10) {
          bubbleTop = altTop;
          actualPlacement = 'bottom';
        }
      }
    }

    if (actualPlacement === 'bottom') {
      bubble.classList.add('tour-bubble-bottom');
    } else {
      bubble.classList.add('tour-bubble-top');
    }

    // Constrain bubbleTop within the viewport
    const minTop = 10;
    const maxTop = viewportRect.height - bubble.offsetHeight - 10;
    bubbleTop = Math.max(minTop, Math.min(maxTop, bubbleTop));

    bubble.style.top = `${bubbleTop}px`;
    bubble.style.left = `${bubbleLeft}px`;

    // Restrict bubble within app-viewport horizontal boundaries (with 10px margin)
    const minLeft = 10;
    const maxLeft = viewportRect.width - bubble.offsetWidth - 10;
    let restrictedLeft = bubbleLeft;

    if (restrictedLeft < minLeft) restrictedLeft = minLeft;
    if (restrictedLeft > maxLeft) restrictedLeft = maxLeft;

    bubble.style.left = `${restrictedLeft}px`;

    // Align the arrow dynamically to point exactly at target center
    const arrow = bubble.querySelector('.tour-arrow');
    if (arrow) {
      const relativeCenter = (left + width / 2) - restrictedLeft;
      // Constrain arrow within the bubble width (with 16px margin on edges)
      const minArrowLeft = 16;
      const maxArrowLeft = bubble.offsetWidth - 16;
      const arrowLeft = Math.max(minArrowLeft, Math.min(maxArrowLeft, relativeCenter));
      arrow.style.left = `${arrowLeft}px`;
    }
  }

  function reposition() {
    if (!active || currentStepIndex === -1 || !highlightedEl) return;
    const step = STEPS[currentStepIndex];
    positionBubble(highlightedEl, step.placement);
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

    // Unregister global click blocker
    document.removeEventListener('click', handleGlobalClick, true);

    if (highlightedEl) {
      highlightedEl.classList.remove('tour-highlight');
      highlightedEl = null;
    }
    document.getElementById('tour-bubble')?.classList.add('hidden');
    localStorage.setItem('socratic-editor-visited', 'true');
    localStorage.removeItem('socratic-editor-tour-force');
  }

  // Intercept all clicks outside the active tour element and the bubble to enforce focus
  function handleGlobalClick(e) {
    if (!active) return;

    // Allow clicks inside tour bubble
    const bubble = document.getElementById('tour-bubble');
    if (bubble && bubble.contains(e.target)) {
      return;
    }

    // Allow clicks inside the highlighted element
    if (highlightedEl && highlightedEl.contains(e.target)) {
      return;
    }

    // Block and consume everything else!
    e.preventDefault();
    e.stopPropagation();

    // Trigger shake animation to guide the user visually
    if (bubble) {
      bubble.classList.remove('tour-bubble-shake');
      void bubble.offsetWidth; // trigger reflow
      bubble.classList.add('tour-bubble-shake');
    }
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

  function onGenerateComplete() {
    if (!active) return;
    if (currentStepIndex === 4) {
      showStep(4);
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

  return { init, start, next, prev, end, onAction, onGenerate, onGenerateComplete, onSheetOpen, onPivotApplied, isActive, reposition };
})();
