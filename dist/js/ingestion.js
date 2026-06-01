/**
 * Ingestion service — file upload + grounding verification (Phase 2.1).
 */
const IngestionService = (() => {
  const ALLOWED = ['.csv', '.sql', '.json'];

  async function ingestFiles(fileList) {
    const files = [];

    for (const file of fileList) {
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      if (!ALLOWED.includes(ext)) {
        files.push({ name: file.name, content: '', rejected: true });
        continue;
      }
      const content = await file.text();
      files.push({ name: file.name, content: content.slice(0, 8000) });
    }

    const response = await fetch('/api/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files }),
    });

    if (!response.ok) throw new Error('Ingestion verification failed');
    return response.json();
  }

  return { ingestFiles, ALLOWED };
})();
