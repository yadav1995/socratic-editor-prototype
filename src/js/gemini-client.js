/**
 * Gemini client — SSE streaming draft generation (Phase 2).
 */
const GeminiClient = (() => {
  let abortController = null;

  async function generateDraft({ scenarioId, sources, onToken, onComplete, onError, onStart }) {
    abortController = new AbortController();

    try {
      const response = await fetch('/api/generate-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId, sources }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`Generation failed (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          const lines = part.split('\n');
          let event = 'message';
          let data = '';

          for (const line of lines) {
            if (line.startsWith('event: ')) event = line.slice(7);
            if (line.startsWith('data: ')) data = line.slice(6);
          }

          if (!data) continue;
          const parsed = JSON.parse(data);

          if (event === 'start' && onStart) onStart(parsed);
          if (event === 'token' && onToken) onToken(parsed.text);
          if (event === 'complete' && onComplete) onComplete(parsed);
          if (event === 'error' && onError) onError(parsed);
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError' && onError) {
        onError({ message: err.message });
      }
    }
  }

  function cancel() {
    abortController?.abort();
  }

  async function checkHealth() {
    try {
      const res = await fetch('/api/health');
      return res.ok ? res.json() : { geminiConfigured: false };
    } catch {
      return { geminiConfigured: false };
    }
  }

  return { generateDraft, cancel, checkHealth };
})();
