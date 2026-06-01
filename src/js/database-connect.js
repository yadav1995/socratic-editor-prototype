/**
 * Database grounding — server-side SQL verification (Architecture §12 / v9)
 * Never sends connection strings from the client.
 */
const DatabaseConnect = (() => {
  async function verifySampleSql() {
    const response = await fetch('/api/connect-database', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sampleFile: 'postgres_dropoff_logs.sql' }),
    });
    if (!response.ok) throw new Error('SQL verification failed');
    return response.json();
  }

  async function verifySqlContent(sqlContent, fileName) {
    const response = await fetch('/api/connect-database', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sqlContent, fileName }),
    });
    if (!response.ok) throw new Error('SQL verification failed');
    return response.json();
  }

  return { verifySampleSql, verifySqlContent };
})();
