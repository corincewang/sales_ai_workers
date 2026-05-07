import { randomUUID } from "node:crypto";

import {
  GAF_COVEO_ANALYTICS_CUSTOM_DATA_CAPTURED,
  GAF_COVEO_FACETS_CAPTURED,
  GAF_COVEO_FIELDS_TO_INCLUDE_CAPTURED,
  buildGafCoveoQueryFunctionsForOrigin,
} from "./gaf-coveo-capture-defaults";
import {
  GAF_DEFAULT_DISTANCE_MILES,
  GAF_LIST_PIPELINE_RESIDENTIAL,
  GAF_ZIP_10013_LATITUDE,
  GAF_ZIP_10013_LONGITUDE,
} from "./gaf-discovery";

/**
 * Coveo Search API v2 JSON body for GAF residential contractor finder (captured from DevTools).
 *
 * Three things must match a real browser request:
 * 1. URL — `GAF_COVEO_SEARCH_V2_URL` (organizationId query param)
 * 2. Header — `Authorization: Bearer <token>`
 * 3. Body — this payload (`buildGafCoveoResidentialSearchBody`)
 *
 * Large arrays (`facets`, `fieldsToInclude`, `queryFunctions`) are **not** guessed here:
 * paste them once from the same Network request you captured (they can change with GAF updates).
 *
 * For the Instalily ZIP **10013** demo, use **`buildGafCoveoResidentialSearchBodyWithCapturedDefaults`**
 * — it embeds arrays from **`gaf-coveo-capture-defaults.ts`** (DevTools capture).
 */

export type GafCoveoActionsHistoryEntry = {
  name: string;
  time: string;
};

export type GafCoveoBuildInput = {
  distanceMiles: number;
  /** Use the same id for `visitorId` + `analytics.clientId` unless you have a reason not to. */
  visitorId: string;
  /** Page size; default browser used 10 — bump to 100+ to pull full result set in one call when API allows. */
  numberOfResults: number;
  firstResult?: number;
  locale?: string;
  timezone?: string;
  tab?: string;
  referrer?: string;
  /** From DevTools payload (required). */
  capture: {
    facets: unknown[];
    fieldsToInclude: string[];
    queryFunctions: unknown[];
    actionsHistory?: GafCoveoActionsHistoryEntry[];
    /** Extra analytics fields from the browser if you need parity; `clientId` / `clientTimestamp` are always set. */
    analytics?: Record<string, unknown>;
  };
};

/** Matches live `aq` pattern: distance + country. */
export function buildGafCoveoAq(distanceMiles: number, countryCode = "USA"): string {
  return `@distanceinmiles <= ${distanceMiles} AND @gaf_f_country_code = ${countryCode}`;
}

export function buildGafCoveoResidentialSearchBody(input: GafCoveoBuildInput): Record<string, unknown> {
  const pipeline = GAF_LIST_PIPELINE_RESIDENTIAL;
  const firstResult = input.firstResult ?? 0;
  const clientTimestamp = new Date().toISOString();

  return {
    locale: input.locale ?? "en-US",
    debug: false,
    tab: input.tab ?? "default",
    referrer: input.referrer ?? "none",
    timezone: input.timezone ?? "America/New_York",
    aq: buildGafCoveoAq(input.distanceMiles),
    context: { sortingStrategy: "gafrecommended-initial" },
    enableQuerySyntax: false,
    facetOptions: { freezeFacetOrder: false },
    facets: input.capture.facets,
    fieldsToInclude: input.capture.fieldsToInclude,
    firstResult,
    numberOfResults: input.numberOfResults,
    pipeline,
    q: "",
    queryFunctions: input.capture.queryFunctions,
    searchHub: pipeline,
    sortCriteria: "relevancy",
    visitorId: input.visitorId,
    actionsHistory: input.capture.actionsHistory ?? [],
    analytics: {
      clientId: input.visitorId,
      clientTimestamp,
      ...input.capture.analytics,
    },
  };
}

export type GafCoveoCapturedDefaultsOptions = {
  /** Default **25** (case study). */
  distanceMiles?: number;
  /** Default **100** so one call can return full metro lists (browser used 10). */
  numberOfResults?: number;
  firstResult?: number;
  visitorId?: string;
  /** Override search origin; default is ZIP **10013** center from live `queryFunctions`. */
  originLatitude?: number;
  originLongitude?: number;
};

/**
 * Body matching a captured GAF residential Coveo request (ZIP **10013** center, facets, fields, distance function).
 * Pair with `POST` + `GAF_COVEO_SEARCH_V2_URL` + `Authorization: Bearer` from `.env` (`GAF_COVEO_BEARER_TOKEN`).
 */
export function buildGafCoveoResidentialSearchBodyWithCapturedDefaults(
  options?: GafCoveoCapturedDefaultsOptions,
): Record<string, unknown> {
  const visitorId = options?.visitorId ?? randomUUID();
  const lat = options?.originLatitude ?? GAF_ZIP_10013_LATITUDE;
  const lng = options?.originLongitude ?? GAF_ZIP_10013_LONGITUDE;

  return buildGafCoveoResidentialSearchBody({
    distanceMiles: options?.distanceMiles ?? GAF_DEFAULT_DISTANCE_MILES,
    visitorId,
    numberOfResults: options?.numberOfResults ?? 100,
    firstResult: options?.firstResult ?? 0,
    capture: {
      facets: [...GAF_COVEO_FACETS_CAPTURED],
      fieldsToInclude: [...GAF_COVEO_FIELDS_TO_INCLUDE_CAPTURED],
      queryFunctions: buildGafCoveoQueryFunctionsForOrigin(lat, lng),
      actionsHistory: [{ name: "Query", time: new Date().toISOString() }],
      analytics: {
        documentReferrer: "none",
        originContext: "Search",
        actionCause: "interfaceChange",
        customData: { ...GAF_COVEO_ANALYTICS_CUSTOM_DATA_CAPTURED },
      },
    },
  });
}
