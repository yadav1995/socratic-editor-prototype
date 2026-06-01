/**
 * Paradox detector — flags speculative/qualitative conflicts (Architecture §8.3).
 */
const PARADOX_SIGNALS = [
  { behavioral: /onboarding|setup|wizard|ux|flow|friction|time-to-value/i, qualitative: /pricing|expensive|cost|value proposition|packaging|tier/i },
  { behavioral: /click-through|discovery|tour|gamif|activation/i, qualitative: /value|perceive|benefit|messaging|copy/i },
  { behavioral: /shorten|reduce steps|simplify|fewer steps/i, qualitative: /retention|complete all|long-term|3\.2×|higher retention/i },
];

function detectParadox(draft, scenario) {
  const grounded = draft.groundedParagraph || '';
  const speculative = draft.speculativeParagraph || '';
  const combined = `${grounded} ${speculative}`;

  let detected = false;
  let confidence = 0;
  let reason = '';
  let conflictingSignals = [];

  for (const signal of PARADOX_SIGNALS) {
    const hasBehavioral = signal.behavioral.test(speculative);
    const hasQualitative = signal.qualitative.test(grounded) || signal.qualitative.test(scenario?.confession?.metaCommentary || '');
    if (hasBehavioral && hasQualitative) {
      detected = true;
      confidence = Math.min(confidence + 0.35, 0.95);
      conflictingSignals.push({
        behavioral: speculative.match(signal.behavioral)?.[0] || 'behavioral pattern',
        qualitative: 'qualitative survey/interview data',
      });
    }
  }

  if (scenario?.confession?.metaCommentary && speculative) {
    detected = true;
    confidence = Math.max(confidence, 0.85);
    reason = 'Confession meta-commentary contradicts speculative behavioral interpretation';
  }

  if (!reason && detected) {
    reason = 'Behavioral log interpretation conflicts with qualitative exit-survey or interview data';
  }

  return {
    hasParadox: detected,
    confidence: Math.round(confidence * 100) / 100,
    reason,
    conflictingSignals,
    badgeLabel: detected ? '⚠️ Data Paradox Tap to inspect' : null,
    recommendation: detected ? 'route-b' : null,
  };
}

module.exports = { detectParadox };
