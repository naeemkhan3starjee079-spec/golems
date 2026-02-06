# @golems/admin

Embeddable React admin dashboard for the Golems ecosystem.

## Setup

```bash
cd packages/admin-ui
npm install
```

Create `.env` with:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_RAILWAY_URL=https://your-cloud-worker.up.railway.app
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

Outputs a library build to `dist/` that can be embedded in other apps:

```tsx
import { GolemsAdmin } from "@golems/admin";

function MyApp() {
  return <GolemsAdmin />;
}
```

## Tabs

- **Dashboard** — Cloud worker status, uptime, LLM cost, recent event count
- **Events** — Supabase `golem_events` table with actor filter
- **Usage** — API call totals and per-source breakdown from Railway `/usage`
- **Outreach** — Recruiter pipeline counts (contacts, messages, companies)
