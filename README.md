# Roofing lead intelligence — MVP

Hour 1: **Next.js (App Router) + PostgreSQL + Prisma** — structured contractors in DB, **read-only** JSON API. **GAF scraper** is Hour 3 (not in this repo step yet).

Detailed checklist: [TODO.md](./TODO.md).

## Stack

- Next.js 16, TypeScript, Tailwind
- Prisma 5 + PostgreSQL
- Dedupe: unique `dedupeKey` (seed/demo uses `seed:zip:slug:suffix`; Hour 3 will align with normalized scrape keys)

## Quick start

1. **PostgreSQL** — either:

   ```bash
   docker compose up -d
   ```

   or use your own instance.

2. **Environment**

   ```bash
   cp .env.example .env
   # Set DATABASE_URL, e.g.:
   # DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/sales_ai?schema=public"
   ```

3. **Migrate & seed**

   ```bash
   npm install
   npx prisma migrate deploy
   npm run db:seed
   ```

4. **Run app**

   ```bash
   npm run dev
   ```

5. **Smoke test**

   - [http://localhost:3000/api/contractors?zip=10013](http://localhost:3000/api/contractors?zip=10013)
   - [http://localhost:3000/api/contractors?zip=10013&q=roof](http://localhost:3000/api/contractors?zip=10013&q=roof)

## API (read-only, DB only)

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/api/contractors` | Query: `zip`, `q` (case-insensitive name contains) |
| `GET` | `/api/contractors/:id` | Single contractor |

Response shape: `{ data: Contractor[] }` or `{ data: Contractor }` / `{ error: string }`.

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
