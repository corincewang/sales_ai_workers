import {
  buildGafCoveoResidentialSearchBodyWithCapturedDefaults,
  type GafCoveoCapturedDefaultsOptions,
} from "./gaf-coveo-payload";
import { GAF_COVEO_ORGANIZATION_ID, GAF_COVEO_PLATFORM_ORIGIN } from "./gaf-discovery";

/** ASCII-only: Node `fetch` requires ByteString header values (no em-dash etc.). */
const DEFAULT_USER_AGENT =
  "SalesAIWorkers/0.1 (Instalily case study; GAF public contractor search; respectful usage)";

export type GafClientErrorCode =
  | "missing_token"
  | "http_error"
  | "invalid_json"
  | "aborted"
  | "network_error";

export class GafClientError extends Error {
  constructor(
    message: string,
    public readonly code: GafClientErrorCode,
    public readonly status?: number,
    public readonly bodySnippet?: string,
  ) {
    super(message);
    this.name = "GafClientError";
  }
}

/** Minimal Coveo search response shape used by the GAF scraper. */
export type GafCoveoSearchHit = {
  title?: string;
  uri?: string;
  clickUri?: string;
  raw?: Record<string, unknown>;
};

export type GafCoveoSearchResponse = {
  totalCount?: number;
  totalCountFiltered?: number;
  pipeline?: string;
  results?: GafCoveoSearchHit[];
};

export type FetchGafCoveoResidentialSearchOptions = {
  /** Full POST body. If omitted, uses {@link buildGafCoveoResidentialSearchBodyWithCapturedDefaults}. */
  body?: Record<string, unknown>;
  /** Passed to the body builder when `body` is omitted. */
  bodyDefaults?: GafCoveoCapturedDefaultsOptions;
  bearerToken?: string;
  searchUrl?: string;
  userAgent?: string;
  /** Sleep this many ms **before each HTTP attempt** (polite rate limiting). */
  requestDelayMs?: number;
  maxRetries?: number;
  /** First backoff slice in ms (doubles each retry, plus small jitter). */
  retryBaseMs?: number;
  signal?: AbortSignal;
};

function resolveSearchV2Url(override?: string): string {
  if (override?.trim()) return override.trim();
  const explicit = process.env.GAF_COVEO_SEARCH_V2_URL?.trim();
  if (explicit) return explicit;
  const org = process.env.GAF_COVEO_ORGANIZATION_ID?.trim() || GAF_COVEO_ORGANIZATION_ID;
  return `${GAF_COVEO_PLATFORM_ORIGIN}/rest/search/v2?organizationId=${encodeURIComponent(org)}`;
}

function resolveBearerToken(override?: string): string {
  const t = override?.trim() || process.env.GAF_COVEO_BEARER_TOKEN?.trim();
  if (!t) {
    throw new GafClientError(
      "Missing Coveo bearer token. Set GAF_COVEO_BEARER_TOKEN in .env or pass bearerToken.",
      "missing_token",
    );
  }
  return t;
}

function resolveUserAgent(override?: string): string {
  return (
    override?.trim() ||
    process.env.GAF_SCRAPE_USER_AGENT?.trim() ||
    DEFAULT_USER_AGENT
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffMs(attemptIndex: number, baseMs: number): number {
  const exp = baseMs * 2 ** attemptIndex;
  const jitter = Math.floor(Math.random() * 250);
  return exp + jitter;
}

function isRetryableHttpStatus(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

/**
 * POST GAF residential contractor search to Coveo Search API v2.
 * — Identifiable **User-Agent** (overridable via env `GAF_SCRAPE_USER_AGENT`).
 * — Optional **pre-request delay** (`requestDelayMs` or `GAF_SCRAPE_REQUEST_DELAY_MS`).
 * — **Retries** with exponential backoff on 429 / 502 / 503 / 504 and network failures.
 */
export async function fetchGafCoveoResidentialSearch(
  options: FetchGafCoveoResidentialSearchOptions = {},
): Promise<GafCoveoSearchResponse> {
  const url = resolveSearchV2Url(options.searchUrl);
  const token = resolveBearerToken(options.bearerToken);
  const userAgent = resolveUserAgent(options.userAgent);
  const body =
    options.body ??
    buildGafCoveoResidentialSearchBodyWithCapturedDefaults(options.bodyDefaults);

  const envDelayRaw = process.env.GAF_SCRAPE_REQUEST_DELAY_MS;
  const envDelayParsed =
    envDelayRaw != null && envDelayRaw !== "" ? Number(envDelayRaw) : NaN;
  const requestDelayMsFromEnv = Number.isFinite(envDelayParsed)
    ? Math.max(0, envDelayParsed)
    : 0;
  const requestDelayMs =
    options.requestDelayMs ?? requestDelayMsFromEnv;

  const envRetriesRaw = process.env.GAF_SCRAPE_MAX_RETRIES;
  const envRetriesParsed =
    envRetriesRaw != null && envRetriesRaw !== "" ? Number(envRetriesRaw) : NaN;
  const maxRetriesFromEnv = Number.isFinite(envRetriesParsed)
    ? Math.max(0, Math.floor(envRetriesParsed))
    : 3;
  const maxRetries = Math.max(0, options.maxRetries ?? maxRetriesFromEnv);

  const envBaseRaw = process.env.GAF_SCRAPE_RETRY_BASE_MS;
  const envBaseParsed =
    envBaseRaw != null && envBaseRaw !== "" ? Number(envBaseRaw) : NaN;
  const retryBaseMsFromEnv = Number.isFinite(envBaseParsed)
    ? Math.max(100, envBaseParsed)
    : 1000;
  const retryBaseMs = options.retryBaseMs ?? retryBaseMsFromEnv;

  let lastNetworkMessage = "";

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (requestDelayMs > 0) {
      await sleep(requestDelayMs);
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          accept: "*/*",
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
          "user-agent": userAgent,
        },
        body: JSON.stringify(body),
        signal: options.signal,
      });

      const text = await response.text();

      if (response.ok) {
        try {
          return JSON.parse(text) as GafCoveoSearchResponse;
        } catch {
          throw new GafClientError(
            "Coveo returned non-JSON body",
            "invalid_json",
            response.status,
            text.slice(0, 400),
          );
        }
      }

      if (isRetryableHttpStatus(response.status) && attempt < maxRetries) {
        await sleep(backoffMs(attempt, retryBaseMs));
        continue;
      }

      throw new GafClientError(
        `Coveo search failed: HTTP ${response.status}`,
        "http_error",
        response.status,
        text.slice(0, 500),
      );
    } catch (err) {
      if (err instanceof GafClientError) throw err;
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new GafClientError("Request aborted", "aborted");
      }
      if ((err as { name?: string })?.name === "AbortError") {
        throw new GafClientError("Request aborted", "aborted");
      }

      lastNetworkMessage = err instanceof Error ? err.message : String(err);
      if (attempt < maxRetries) {
        await sleep(backoffMs(attempt, retryBaseMs));
        continue;
      }

      throw new GafClientError(
        `Coveo request failed after ${maxRetries + 1} attempt(s): ${lastNetworkMessage}`,
        "network_error",
        undefined,
        lastNetworkMessage.slice(0, 200),
      );
    }
  }

  throw new GafClientError("Coveo search exhausted retries without result", "http_error");
}
