# The Socratic Editor

Mobile wireframe prototype for AI productivity workflows that surface **grounded vs. speculative** reasoning, with human-in-the-loop structural pivots.

## Quick start

```bash
node server/server.js
```

Open [http://localhost:3000](http://localhost:3000)

### Optional: Gemini live streaming

```bash
cp .env.example .env
# Set GEMINI_API_KEY=your_key
node server/server.js
```

### Optional: Live PostgreSQL (server-side only)

```bash
# Install pg once: npm install pg
# Set DATABASE_URL in .env (never exposed to the browser)
DATABASE_URL=postgresql://user:pass@localhost:5432/analytics
```

Then call `POST /api/connect-database` with `{ "useServerDatabase": true }`.

## Demo flow (Churn Analysis)

1. **Load sample files** — ingests `100_Exit_Surveys.csv` + `postgres_dropoff_logs.sql`
2. **Verify SQL source** — server-side SQL grounding (§12, no credentials in client)
3. **Generate Framework** — streams draft (Gemini or simulated)
4. Tap **Data Paradox** badge → Socratic confession sheet
5. **Apply Structural Pivot** (Route B recommended)
6. **Decision History** (clock icon) — audit trail

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Run dev server |
| `npm test` | Run unit + API tests (Node built-in) |
| `npm run test:smoke` | §13.1 manual checklist (server must be running) |
| `npm run build` | Bundle to `dist/` for deployment |

## Project structure

```
prototype/
├── docs/              # architecture.md, Problemstatememnt
├── server/            # Node API (zero npm deps)
│   ├── server.js
│   └── services/      # PII, paradox, audit, SQL grounding, schema
├── src/               # Frontend (HTML + Tailwind CDN)
├── tests/             # v8 automated tests
├── scripts/           # build.js, smoke-checklist.js
└── dist/              # Production build output (generated)
```

## API overview

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/health` | GET | Service status |
| `/api/self-test` | GET | Internal diagnostics (v8) |
| `/api/scenarios` | GET | Project catalog |
| `/api/ingest` | POST | File upload + PII redaction |
| `/api/connect-database` | POST | SQL grounding (v9) |
| `/api/generate-draft` | POST | SSE draft stream |
| `/api/detect-paradox` | POST | Paradox analysis |
| `/api/audit` | GET/POST | Decision audit log |

## Docker

```bash
docker build -t socratic-editor .
docker run -p 3000:3000 -e GEMINI_API_KEY=your_key socratic-editor
```

## Architecture

See [docs/architecture.md](docs/architecture.md) for the full evolution roadmap (v1–v9).
