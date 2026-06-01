/**
 * View router — finite state machine for screen transitions.
 */
const Router = (() => {
  const SCREENS = {
    ingestion: 'screen-ingestion',
    draft: 'screen-draft',
  };

  let currentScreen = 'ingestion';
  let onNavigate = null;

  function init(navigateCallback) {
    onNavigate = navigateCallback;
    InteractionController.onNavigate('ingestion');
    showScreen('ingestion');
  }

  function showScreen(screenId) {
    if (!SCREENS[screenId]) return;

    Object.entries(SCREENS).forEach(([id, elementId]) => {
      const el = document.getElementById(elementId);
      if (!el) return;

      if (id === screenId) {
        el.classList.remove('screen-hidden');
        el.classList.add('screen-visible');
        el.removeAttribute('aria-hidden');
      } else {
        el.classList.remove('screen-visible');
        el.classList.add('screen-hidden');
        el.setAttribute('aria-hidden', 'true');
      }
    });

    currentScreen = screenId;
    InteractionController.onNavigate(screenId);
    ProgressTracker.onScreenChange(screenId);
    if (onNavigate) onNavigate(screenId);
  }

  function goToDraft() {
    showScreen('draft');
  }

  function goToIngestion() {
    showScreen('ingestion');
  }

  function getCurrentScreen() {
    return currentScreen;
  }

  return { init, goToDraft, goToIngestion, getCurrentScreen };
})();
