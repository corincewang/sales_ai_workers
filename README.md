# Roofing lead intelligence — MVP

**Next.js + PostgreSQL + Prisma** — contractors API, **AI insights** (`/dashboard`), **GAF scrape** (Hour 3 in progress). See [TODO.md](./TODO.md).

Detailed checklist: [TODO.md](./TODO.md).

## Stack

- Next.js 16, TypeScript, Tailwind
- Prisma 5 + PostgreSQL
- **Hour 2:** `openai`, `zod` (structured insights); default insight model **`gpt-4o-mini`** (`OPENAI_MODEL`)
- Dedupe: unique `dedupeKey` (seed/demo uses `seed:zip:slug:suffix`; Hour 3 will align with normalized scrape keys)

## GAF raw payload (scheme A)

`RawLeadSource.rawData` is one JSON document per scrape, with **four top-level sections** aligned to the public listing: `aboutUs`, `certification`, `contractorDetails`, `reviews`, plus optional `meta`. **Contractor** stays flat for search/API; ETL reads these blocks in Hour 3. TypeScript: [`src/types/gaf-raw-data.ts`](./src/types/gaf-raw-data.ts).

## GAF discovery (Hour 3-1)

Case study entry: `https://www.gaf.com/en-us/roofing-contractors/residential?distance=25`, ZIP **10013**. The finder is SPA-driven; **confirm list/detail URLs in your browser** (DevTools → Network → Fetch/XHR) after searching by ZIP. Many environments get **403** on raw `curl` (Akamai); **your laptop browser** is the reliable place to capture the real request template. Constants + checklist: [`src/lib/scrape/gaf-discovery.ts`](./src/lib/scrape/gaf-discovery.ts).

**Compliance:** follow [GAF](https://www.gaf.com) **robots.txt** and terms; Coveo calls use **your own** short-lived bearer token (demo/local); keep rate limits modest (`GAF_SCRAPE_*`, `GAF_INSIGHT_DELAY_MS`).

## Real data path (no seed required for demo)

1. Set **`DATABASE_URL`**, **`GAF_COVEO_BEARER_TOKEN`** (and optional Coveo URL/org overrides per [.env.example](./.env.example)).
2. **`npm run scrape:gaf`** — upserts contractors from the live list + append-only **`RawLeadSource`** rows.
3. Optional: **`GAF_SCRAPE_GENERATE_INSIGHTS=1 npm run scrape:gaf`** — batch **`LeadInsight`** after scrape (sequential + delay).
4. Or **`POST /api/admin/scrape`** with JSON e.g. `{ "generateInsights": true }` and header **`x-admin-scrape-secret`** when **`SCRAPE_ADMIN_SECRET`** is set (required in production; dev can omit both).

**Data quality over time:** `lastSeenAt` updates on each upsert; raw rows are **append-only** for audit; re-scrapes **merge** non-empty fields only (empty scrape fields do not wipe DB). Insights default to **only missing** so re-runs stay cheap; set `onlyMissingInsights: false` on the admin body to force new rows per contractor.

## Quick start

1. **PostgreSQL** — either:

   ```bash
   docker compose up -d
   ```

   or use your own instance.

2. **Environment**

   ```bash
   cp .env.example .env
   ```

   Set **`DATABASE_URL`** for your Postgres user. For **Hour 2 insights**, set **`OPENAI_API_KEY`** (see [.env.example](./.env.example)). Optional: **`OPENAI_MODEL`**, **`INSIGHT_PROMPT_VERSION`** (defaults are applied in code when unset).

3. **Migrate** (then *either* demo seed *or* real Coveo data)

   ```bash
   npm install
   npx prisma migrate deploy
   ```

   - **Demo / interview with fake + sample rows:** `npm run db:seed`
   - **Only real GAF list data:** **do not** run `db:seed`. Continue with [Real data path](#real-data-path-no-seed-required-for-demo) (`npm run scrape:gaf` or `POST /api/admin/scrape`). If you already seeded and want a clean DB: `npx prisma migrate reset --skip-seed` then migrate + scrape again.

4. **Run app**

   ```bash
   npm run dev
   ```

5. **Smoke test**

   - [Dashboard — list + generate insight](http://localhost:3000/dashboard) (needs `OPENAI_API_KEY`)
   - [http://localhost:3000/api/contractors?zip=10013](http://localhost:3000/api/contractors?zip=10013)

## API

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/api/contractors` | Query: `zip`, `q` (case-insensitive name contains); read DB only |
| `GET` | `/api/contractors/:id` | Single contractor; optional `?include=latestInsight` appends newest `LeadInsight` |
| `POST` | `/api/contractors/:id/insights` | OpenAI insight + append `LeadInsight`; **201** `{ data }` or `{ error, code? }` |
| `POST` | `/api/admin/scrape` | Demo: Coveo scrape → upsert; body `{ pageSize?, generateInsights?, onlyMissingInsights?, insightDelayMs? }`; auth: `x-admin-scrape-secret` |

Errors (examples): `MISSING_OPENAI_KEY` **503**, `RATE_LIMIT` **429**, `TIMEOUT` **504**, `INVALID_MODEL_OUTPUT` / `OPENAI_ERROR` **502**.

## Git remote

Local repo is initialized by the Next.js scaffold. Link your Git host:

```bash
git remote add origin https://github.com/<you>/<repo>.git
git branch -M main
git push -u origin main
```

## Node version

Template dependencies may warn on Node **&lt; 20.19**. This project uses **Prisma 5.22** so **Node 20.11** remains usable. Upgrade Node when convenient.

## License

Interview / portfolio use — respect robots.txt and site terms for any scraping (Hour 3).
