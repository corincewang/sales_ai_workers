import type { GafCoveoSearchHit, GafCoveoSearchResponse } from "./gaf-client";

/** One Coveo hit after validation (GAF list search). */
export type ParsedGafCoveoHit = {
  title: string;
  sourceUrl: string;
  raw: Record<string, unknown>;
  contractorId: string;
};

/**
 * Flattens `results[]` from a Coveo search response into rows we can ETL.
 * Skips hits without `raw.gaf_contractor_id`.
 */
export function extractGafCoveoListHits(response: GafCoveoSearchResponse): ParsedGafCoveoHit[] {
  const results = response.results ?? [];
  const out: ParsedGafCoveoHit[] = [];

  for (const hit of results) {
    const parsed = parseOneGafCoveoHit(hit);
    if (parsed) out.push(parsed);
  }
  return out;
}

export function parseOneGafCoveoHit(hit: GafCoveoSearchHit): ParsedGafCoveoHit | null {
  const raw = hit.raw;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const bag = raw as Record<string, unknown>;
  const idRaw = bag.gaf_contractor_id;
  if (typeof idRaw !== "string" || !idRaw.trim()) return null;

  const sourceUrl =
    (typeof hit.clickUri === "string" && hit.clickUri.trim()) ||
    (typeof hit.uri === "string" && hit.uri.trim()) ||
    (typeof bag.uri === "string" && bag.uri.trim()) ||
    (typeof bag.sysuri === "string" && bag.sysuri.trim()) ||
    "";

  const title =
    (typeof hit.title === "string" && hit.title.trim()) ||
    (typeof bag.gaf_navigation_title === "string" && bag.gaf_navigation_title.trim()) ||
    idRaw.trim();

  return {
    title,
    sourceUrl,
    raw: bag,
    contractorId: idRaw.trim(),
  };
}
