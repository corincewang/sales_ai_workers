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
 * ## Optional env for Hour 3+
 * - `GAF_BASE_URL` — default `https://www.gaf.com`
 * - `GAF_SEARCH_DISTANCE` — default `25` (matches brief)
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
