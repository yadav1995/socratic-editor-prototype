/**
 * Load bundled sample ground-truth files (Problem Statement sources)
 */
const SampleSources = (() => {
  const FILES = [
    { path: '/content/samples/100_Exit_Surveys.csv', name: '100_Exit_Surveys.csv' },
    { path: '/content/samples/postgres_dropoff_logs.sql', name: 'postgres_dropoff_logs.sql' },
  ];

  async function loadAll() {
    const files = [];
    for (const spec of FILES) {
      const res = await fetch(spec.path);
      if (!res.ok) continue;
      files.push({ name: spec.name, content: await res.text() });
    }
    return files;
  }

  async function ingestSamples() {
    const files = await loadAll();
    if (!files.length) throw new Error('Sample files not found');

    const response = await fetch('/api/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files }),
    });
    if (!response.ok) throw new Error('Sample ingestion failed');
    return response.json();
  }

  return { loadAll, ingestSamples };
})();
