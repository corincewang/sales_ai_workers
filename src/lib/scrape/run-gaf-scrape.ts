import type { PrismaClient } from "@prisma/client";

import { fetchGafCoveoResidentialSearch } from "./gaf-client";
import { extractGafCoveoListHits } from "./gaf-coveo-parse";
import type { UpsertGafListHitResult } from "./upsert-contractor-from-scrape";
import { upsertContractorFromGafListHit } from "./upsert-contractor-from-scrape";

export type RunGafScrapeOptions = {
  /** Coveo `numberOfResults`; clamped 1–200 in client path. */
  pageSize?: number;
};

export type RunGafScrapeResult = {
  totalCount: number | null;
  hitsParsed: number;
  created: number;
  updated: number;
  upserts: UpsertGafListHitResult[];
};

/**
 * Full list scrape for ZIP 10013 (see gaf-coveo payload defaults): fetch → parse → upsert each hit.
 */
export async function runGafCoveoResidentialScrape(
  db: PrismaClient,
  options: RunGafScrapeOptions = {},
): Promise<RunGafScrapeResult> {
  const pageSize = Number(options.pageSize ?? process.env.GAF_SCRAPE_PAGE_SIZE ?? "100");
  const n = Number.isFinite(pageSize) ? Math.min(200, Math.max(1, Math.floor(pageSize))) : 100;

  const response = await fetchGafCoveoResidentialSearch({
    bodyDefaults: { numberOfResults: n },
  });

  const hits = extractGafCoveoListHits(response);
  const upserts: UpsertGafListHitResult[] = [];
  let created = 0;
  let updated = 0;

  for (const hit of hits) {
    const r = await upsertContractorFromGafListHit(db, hit);
    upserts.push(r);
    if (r.created) created += 1;
    else updated += 1;
  }

  return {
    totalCount: response.totalCount ?? null,
    hitsParsed: hits.length,
    created,
    updated,
    upserts,
  };
}
