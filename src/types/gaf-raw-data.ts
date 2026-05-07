import type { Prisma } from "@prisma/client";

/**
 * Scheme A — one RawLeadSource row; `rawData` mirrors GAF (or similar) public listing sections.
 * Hour 3 scraper should fill the four blocks verbatim (or parsed objects) before ETL maps into Contractor.
 *
 * Keys are optional until the scraper implements each section; unknown keys are allowed at runtime.
 */
export type GafSectionPayload = Prisma.JsonValue;

export interface GafRawData {
  aboutUs?: GafSectionPayload;
  certification?: GafSectionPayload;
  contractorDetails?: GafSectionPayload;
  reviews?: GafSectionPayload;
  /** e.g. scrape run id, fetchedAt, response headers — keep small */
  meta?: Record<string, unknown>;
}

/** Type guard convenience — does not validate depth */
export function isGafRawData(value: Prisma.JsonValue): value is GafRawData & Record<string, Prisma.JsonValue> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
