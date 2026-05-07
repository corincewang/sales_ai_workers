# MVP todo list (P0 + 3-hour interview plan)

Cross-reference: **official project scope** (collection, ETL/quality, AI insights, backend storage/concurrency), **success criteria** (architecture, use case fit, compliance/efficiency, insight quality), internal ERD (`RAW_LEAD_SOURCE`, `CONTRACTOR`, `LEAD_INSIGHT`), and hour-by-hour goals.

---

## How this maps to the official requirements

| Requirement area | What you will show in MVP |
|------------------|---------------------------|
| **1. Data collection** | GAF-focused scraper for ZIP **10013**; **raw JSON + source URL + timestamp**; **rate limit + retry**; **User-Agent** / identify client; **robots.txt / terms** stance documented and honored in code where feasible |
| **2. ETL / data quality** | Normalize phone/url/address; **dedupe** with documented key; **merge rules** (do not replace good non-empty fields with empty scrapes); **`lastSeenAt`** for freshness story |
| **3. AI insights** | **ChatGPT and/or Perplexity** via API; **pre-generated, stored** insights; structured outputs: summary, **industry/company type**, **talking points**, priority, products, risks; **`modelVersion` / `promptVersion`** on stored rows; traceability to contractor facts |
| **4. Backend** | **Structured** columns (`Contractor`) + **unstructured** JSON (`rawData`, insight JSON blobs); **read path = DB** (not live scrape per request); **upserts** for consistency under repeated runs/concurrent callers |

---

## Hour 1 — Data model + sample pipeline

**Goal:** Prove **structured + unstructured** storage and **read API** correctness (official: data storage/management + accessibility).

**Evaluator lens:** Backend (mixed data); foundation for ETL and AI tables.

- [ ] **Project bootstrap** — Next.js app, PostgreSQL, Prisma (`schema.prisma`), `.env.example` (no secrets)
- [ ] **Models (Prisma)** — Align with ERD and requirements:
  - [ ] **`Contractor`** — Structured fields: id, name, phone, website, address, city, state, zipCode, certificationLevel, lastSeenAt; relations as needed
  - [ ] **`RawLeadSource`** — **Unstructured:** `rawData` (JSON), plus `sourceName`, `sourceUrl`, `scrapedAt`; link to contractor when normalized (optional FK or join table — document choice)
  - [ ] **`LeadInsight`** — Mix: scalar fields + JSON (`talkingPoints`, `recommendedProducts`, `risks`); include **`generatedAt`**, plus **`modelVersion`** and **`promptVersion`** (strings, set in Hour 2)
- [ ] **Uniqueness / indexes** — Add DB constraints or indexes needed for your **dedupe key** (defined in README, implemented in Hour 3)
- [ ] **Migrations** — Initial migration applied locally
- [ ] **Seed data** — 5–10 sample `Contractor` rows (mix complete/partial fields)
- [ ] **Read API** — Routes **read from DB only** (no scrape): list contractors, get by id; JSON stable for dashboard
- [ ] **Concurrency / consistency (narrative + minimal design)** — Stateless route handlers; Postgres as single source of truth; no read-time side effects; note where **upsert** will apply (Hour 3)
- [ ] **Smoke check** — `curl` or browser validates shapes

---

## Hour 2 — AI insight generation

**Goal:** **Actionable sales intelligence** from contractor facts; **aligned with ChatGPT / Perplexity** requirement; auditable outputs.

**Evaluator lens:** AI insights engine; insight quality; “raw → actionable” story.

- [ ] **`generateLeadInsight(contractor)`** — Wire **OpenAI ChatGPT and/or Perplexity** (env-driven provider); implementation after approved signatures (see README)
- [ ] **Prompt + grounding** — Pass **structured contractor fields** (and optional short evidence bullets) so outputs are **grounded**, not generic fluff
- [ ] **Structured output contract** — LLM returns JSON matching `LeadInsight` (summary, companyType/industry type, priorityScore, talkingPoints, recommendedProducts, risks); validate with **Zod** before persist
- [ ] **Persist with lineage** — Save row with `generatedAt`, **`modelVersion`**, **`promptVersion`** (e.g. `gpt-4.1` + `v1`); link `contractorId`
- [ ] **Optional: evidence JSON** — Small field e.g. `evidence` or `sourceFacts` JSON on `LeadInsight` if you want a direct “built from these fields” demo
- [ ] **API + UI** — Nested or parallel fetch: show **summary**, **priority score**, **talking points** (required); products/risks if time
- [ ] **Error handling** — Missing API key, rate limits, timeouts, invalid JSON → clear API errors and logs

---

## Hour 3 — Data collection + ETL + demo polish

**Goal:** **Scalable-oriented** collection habits (even if MVP is single ZIP); full **collect → clean → enrich → present** loop for ZIP **10013**.

**Evaluator lens:** Collection efficiency + **compliance**; ETL + **relevance over time** (`lastSeenAt`, merge rules, dedupe).

- [ ] **GAF scraper for ZIP `10013`** — Extract: company name, address, phone, website, certification, **source URL**; design for **batch-by-ZIP** extension later
- [ ] **Compliance & efficiency in code** — **Rate limiting** between requests; **retry with backoff** on transient failures; **User-Agent** (or similar) identifying the tool; **check/document robots.txt** before demo (if fetch is disallowed, have fallback narrative + sample raw files)
- [ ] **Raw storage** — Each scrape write → **`RawLeadSource`** with full **`rawData`**, `sourceUrl`, `scrapedAt`
- [ ] **ETL** — Normalize fields; **`upsert` `Contractor`** with documented **dedupe** key
- [ ] **Data quality** — **Merge:** never overwrite a non-empty stored field with an empty scrape; **`lastSeenAt`** on successful upsert
- [ ] **Insight refresh** — Regenerate (or upsert latest) **`LeadInsight`** for new/changed contractors after ETL
- [ ] **Dashboard polish** — Search/filter; insight panel; loading/empty states as time allows
- [ ] **README + demo script** — Run order: DB, seed, scrape, open app; **2-minute architecture** (collection, ETL/quality, AI, API); **success criteria** checklist ticked for reviewers

---

## Post-MVP (P1 / P2) — keep as “scale & product” backlog

Not required for the 3-hour interview MVP; brief list so you can answer “what’s next?”

- [ ] **Queues / workers** — Redis, BullMQ, dedicated scraper & AI workers  
- [ ] **Scheduled refresh** — Stale detection, multi-ZIP batches  
- [ ] **Full-text / vector search** — Over contractors and insights  
- [ ] **Async insight jobs** — Dedupe job runs, CRM export  

---

## Done = MVP checklist (matches success criteria)

**Architecture & scalability**

- [ ] Can explain **layers** (collect → raw → ETL → structured DB → AI → API) and **what scales** next (queue, workers, batch ZIPs)

**Use case alignment**

- [ ] Sales-facing outputs: **summary**, **priority**, **engagement talking points**, company/industry type, optional products/risks

**Collection efficiency & compliance**

- [ ] **Rate limits + retries**; **source URL + time** on every raw row; **robots/terms** stance; **no** non-public personal data

**Insight quality**

- [ ] Grounded in **stored contractor facts**; validated JSON; **model/prompt version** for reproducibility

**Backend**

- [ ] **Structured + unstructured** in Prisma; reads from **DB**; **upserts** keep data consistent across reruns
