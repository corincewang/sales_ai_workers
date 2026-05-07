/**
 * Hour 3-1 — GAF “contractor finder” URL & discovery notes (no runtime fetch here).
 *
 * ## Case study anchor
 * - Data source: `https://www.gaf.com/en-us/roofing-contractors/residential?distance=25`
 * - Target ZIP: **10013** (Manhattan, New York, NY)
 *
 * ## What we know without private APIs
 * - The locator is a **SPA**: after entering ZIP, results load via **XHR/fetch** (not always in first HTML).
 * - Public result URLs often follow a **geo slug** pattern:
 *   `/en-us/roofing-contractors/residential/usa/{state}/{city-or-area}?distance=…`
 *   Example pattern seen in the wild: `…/usa/ny/homes?distance=25` / city names like `new-york`.
 * - **ZIP 10013** should resolve to **NY** + a **NYC / Manhattan–adjacent** slug once the site geocodes the postal code.
 *
 * ## Why server-side curl may fail
 * - Requests from many datacenter IPs get **403** (Akamai / bot mitigation). That does **not** mean your laptop browser will fail.
 * - Respect **robots.txt** and **terms**; prefer rates limited, identified clients when allowed.
 *
 * ## Manual discovery (do this once in Chrome on your machine)
 * 1. Open DevTools → **Network** → filter **Fetch/XHR**.
 * 2. Visit the case study URL; enter **10013** (or let the site use geo); submit search.
 * 3. Copy:
 *    - The **document** or **JSON** URL that returns the **list** of contractors (pagination if any).
 *    - One **contractor detail** page URL pattern (already seen as `…/residential/usa/{state}/{city}/{slug}-{id}`).
 * 4. Put the list URL (or base + query template) into env **`GAF_LIST_FETCH_URL`** or hardcode in `gaf-client.ts` after confirmation.
 *
 * ## Confirmed list response shape (DevTools JSON — the “good” payload)
 * - **Use this** when the Network tab shows JSON with `totalCount`, `results[]`, and `pipeline`.
 * - Example pipeline name seen live: **`prod-gaf-recommended-residential-contractors`** (Coveo/search-style API).
 * - Each `results[]` item includes `title`, `uri` / `clickUri` (detail page), and a **`raw`** object with flat `gaf_*` fields
 *   (`gaf_contractor_id`, `gaf_phone`, `gaf_f_city`, `gaf_f_state_code`, `gaf_postal_code`, certifications, ratings, etc.).
 * - That response is enough for MVP ingestion: store **`raw` + list metadata** in `RawLeadSource.rawData` (optionally wrap with `{ source: "gaf-list", listResponse: … }` for lineage).
 *
 * ## What is *not* contractor data
 * - JSON shaped like **`DomainData`** / **`Groups`** / OneTrust cookie categories is the **privacy preference center config**.
 *   It has nothing to do with contractors; ignore it for scraping.
 *
 * ## Confirmed Coveo endpoint (Hour 3-1)
 * - Base (from DevTools): **`https://platform.cloud.coveo.com/rest/search/v2?organizationId=…`**
 * - Implementation note: Coveo **Search API v2** is almost always **`POST`** to that URL with a **JSON body** (query, pipeline, aq/cq, pagination, context).
 * - The browser sends **`Authorization: Bearer <token>`** (search token / visitor token). For Node `fetch`, copy the same header from DevTools or set `GAF_COVEO_BEARER_TOKEN` in `.env` for local demos (tokens expire — not for long-lived prod without official API access).
 * - JSON **body** builder: see `src/lib/scrape/gaf-coveo-payload.ts` (`buildGafCoveoResidentialSearchBody`).
 * - **HTTP client** (Hour 3-2): `src/lib/scrape/gaf-client.ts` (`fetchGafCoveoResidentialSearch`).
 *
 * ## Optional env for Hour 3+
 * - `GAF_BASE_URL` — default `https://www.gaf.com`
 * - `GAF_SEARCH_DISTANCE` — default `25` (matches brief)
 * - `GAF_COVEO_ORGANIZATION_ID` — overrides default org id below if GAF changes tenants
 * - `GAF_COVEO_BEARER_TOKEN` — Bearer token for `POST …/rest/search/v2` (from DevTools; demo only)
 */

export const GAF_BASE_URL = "https://www.gaf.com";

/** Instalily brief — entry point for residential finder + default radius. */
export const GAF_RESIDENTIAL_ENTRY_PATH =
  "/en-us/roofing-contractors/residential?distance=25";

export const GAF_RESIDENTIAL_ENTRY_URL = `${GAF_BASE_URL}${GAF_RESIDENTIAL_ENTRY_PATH}`;

/** Default search radius (miles) from case study. */
export const GAF_DEFAULT_DISTANCE_MILES = 25;

/** Target ZIP for MVP demo. */
export const GAF_TARGET_ZIP = "10013";

/**
 * Geocoded search origin for {@link GAF_TARGET_ZIP} from a live Coveo `queryFunctions` capture
 * (`dist(@gaf_latitude, @gaf_longitude, …)`).
 */
export const GAF_ZIP_10013_LATITUDE = 40.7217861;
export const GAF_ZIP_10013_LONGITUDE = -74.0094471;

/**
 * Search pipeline name from a captured list JSON response (Coveo-style).
 * Use to validate responses in Hour 3 parsers.
 */
export const GAF_LIST_PIPELINE_RESIDENTIAL =
  "prod-gaf-recommended-residential-contractors";

/** Coveo Cloud host for Search API v2. */
export const GAF_COVEO_PLATFORM_ORIGIN = "https://platform.cloud.coveo.com";

/**
 * Organization id query param on Search v2 (captured from live `rest/search/v2?organizationId=…`).
 * Override with env `GAF_COVEO_ORGANIZATION_ID` in `gaf-client` when wiring config.
 */
export const GAF_COVEO_ORGANIZATION_ID =
  "gafmaterialscorporationproduction3yalqk12";

/** Full Search v2 URL used by the browser for GAF residential contractor search. */
export const GAF_COVEO_SEARCH_V2_URL = `${GAF_COVEO_PLATFORM_ORIGIN}/rest/search/v2?organizationId=${encodeURIComponent(
  GAF_COVEO_ORGANIZATION_ID,
)}`;

/**
 * Candidate listing paths to try **after** you confirm the real slug via browser or XHR.
 * Order is arbitrary; **only use paths verified** against live HTML or API responses.
 */
export const GAF_ZIP_10013_CANDIDATE_LIST_PATHS = [
  `${GAF_BASE_URL}/en-us/roofing-contractors/residential/usa/ny/new-york?distance=${GAF_DEFAULT_DISTANCE_MILES}`,
  `${GAF_BASE_URL}/en-us/roofing-contractors/residential/usa/ny/manhattan?distance=${GAF_DEFAULT_DISTANCE_MILES}`,
] as const;

/** Detail pages use numeric GAF contractor id in URL (matches seed examples). */
export const GAF_DETAIL_URL_EXAMPLE =
  "https://www.gaf.com/en-us/roofing-contractors/residential/usa/nj/elmwood-park/donnys-home-improvement-1139561";

/**
 * Optional enrichment — paginated **reviews** for a contractor (separate from Coveo list search).
 * DevTools example: `GET …/gaf/api/v1/reviews/{gaf_contractor_id}?page=1&pagesize=3`
 * CORS target: `surefiregaf.webservices.sfs.io` (browser: `credentials: omit`). Server-side `fetch` is usually fine for read-only JSON.
 * MVP can skip this; list `raw` already has `gaf_number_of_reviews` and rating summaries.
 */
export const GAF_REVIEWS_API_ORIGIN = "https://surefiregaf.webservices.sfs.io";

export function gafReviewsListUrl(
  gafContractorId: string,
  params?: { page?: number; pagesize?: number },
): string {
  const page = params?.page ?? 1;
  const pagesize = params?.pagesize ?? 3;
  const q = new URLSearchParams({
    page: String(page),
    pagesize: String(pagesize),
  });
  return `${GAF_REVIEWS_API_ORIGIN}/gaf/api/v1/reviews/${encodeURIComponent(
    gafContractorId,
  )}?${q}`;
}
