import { GAF_TARGET_ZIP } from "./gaf-discovery";
import type { ParsedGafCoveoHit } from "./gaf-coveo-parse";

/** Aligns with seed / Hour 3 plan: one stable key per GAF contractor directory id. */
export function buildGafDedupeKey(gafContractorId: string): string {
  return `gaf:${gafContractorId.trim()}`;
}

function str(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t || null;
}

function normalizePhone(phone: string | null): string | null {
  if (!phone) return null;
  const t = phone.replace(/\s+/g, " ").trim();
  return t || null;
}

function certificationsToLevel(raw: Record<string, unknown>): string | null {
  const r = raw.gaf_f_contractor_certifications_and_awards_residential;
  if (!Array.isArray(r) || r.length === 0) return null;
  const parts = r.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
  return parts.length ? parts.join("; ") : null;
}

/** Fields that map into `Contractor` (Prisma). */
export type NormalizedGafContractor = {
  dedupeKey: string;
  name: string;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string;
  certificationLevel: string | null;
};

/**
 * List response has no business website URL in captured `fieldsToInclude`; `website` stays null until detail scrape.
 */
export function normalizeContractorFromGafCoveoHit(
  hit: ParsedGafCoveoHit,
  fallbackZip = GAF_TARGET_ZIP,
): NormalizedGafContractor {
  const { raw } = hit;
  const zip = str(raw.gaf_postal_code) ?? fallbackZip;
  const city = str(raw.gaf_f_city);
  const state = str(raw.gaf_f_state_code);
  const address =
    city && state
      ? `${city}, ${state} ${zip}`.trim()
      : [city, state, zip].filter(Boolean).join(", ") || null;

  return {
    dedupeKey: buildGafDedupeKey(hit.contractorId),
    name: hit.title,
    phone: normalizePhone(str(raw.gaf_phone)),
    website: null,
    address,
    city,
    state,
    zipCode: zip,
    certificationLevel: certificationsToLevel(raw),
  };
}

export function nonEmptyString(s: string | null | undefined): s is string {
  return typeof s === "string" && s.length > 0;
}
