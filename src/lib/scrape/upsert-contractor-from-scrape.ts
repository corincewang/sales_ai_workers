import type { Contractor, Prisma, PrismaClient } from "@prisma/client";
import type { InputJsonValue } from "@prisma/client/runtime/library";

import type { ParsedGafCoveoHit } from "./gaf-coveo-parse";
import {
  type NormalizedGafContractor,
  nonEmptyString,
  normalizeContractorFromGafCoveoHit,
} from "./normalize-contractor-from-gaf";

function mergeUpdateData(
  existing: Contractor,
  incoming: NormalizedGafContractor,
): Prisma.ContractorUpdateInput {
  return {
    name: nonEmptyString(incoming.name) ? incoming.name : existing.name,
    phone: nonEmptyString(incoming.phone) ? incoming.phone : existing.phone,
    website: nonEmptyString(incoming.website) ? incoming.website : existing.website,
    address: nonEmptyString(incoming.address) ? incoming.address : existing.address,
    city: nonEmptyString(incoming.city) ? incoming.city : existing.city,
    state: nonEmptyString(incoming.state) ? incoming.state : existing.state,
    zipCode: nonEmptyString(incoming.zipCode) ? incoming.zipCode : existing.zipCode,
    certificationLevel: nonEmptyString(incoming.certificationLevel)
      ? incoming.certificationLevel
      : existing.certificationLevel,
    lastSeenAt: new Date(),
  };
}

function listHitToRawJson(hit: ParsedGafCoveoHit): InputJsonValue {
  return {
    meta: {
      kind: "gaf-coveo-residential-list",
      sourceUrl: hit.sourceUrl,
    },
    coveo: {
      title: hit.title,
      contractorId: hit.contractorId,
      raw: hit.raw as InputJsonValue,
    },
  };
}

export type UpsertGafListHitResult = {
  contractorId: string;
  dedupeKey: string;
  created: boolean;
};

/**
 * Upserts `Contractor` by `gaf:{id}` and appends one **RawLeadSource** row (append-only raw audit).
 * Merge rule: do not overwrite non-empty DB fields with empty incoming values.
 */
export async function upsertContractorFromGafListHit(
  db: PrismaClient,
  hit: ParsedGafCoveoHit,
): Promise<UpsertGafListHitResult> {
  const normalized = normalizeContractorFromGafCoveoHit(hit);
  const rawData = listHitToRawJson(hit);
  const sourceUrl =
    hit.sourceUrl.trim() ||
    `https://www.gaf.com/en-us/roofing-contractors/residential?dedupe=${encodeURIComponent(normalized.dedupeKey)}`;

  const existing = await db.contractor.findUnique({
    where: { dedupeKey: normalized.dedupeKey },
  });

  if (existing) {
    await db.contractor.update({
      where: { id: existing.id },
      data: mergeUpdateData(existing, normalized),
    });
    await db.rawLeadSource.create({
      data: {
        sourceName: "gaf-coveo-residential",
        sourceUrl,
        rawData,
        contractorId: existing.id,
      },
    });
    return { contractorId: existing.id, dedupeKey: normalized.dedupeKey, created: false };
  }

  const createdRow = await db.contractor.create({
    data: {
      ...normalized,
      lastSeenAt: new Date(),
    },
  });
  await db.rawLeadSource.create({
    data: {
      sourceName: "gaf-coveo-residential",
      sourceUrl,
      rawData,
      contractorId: createdRow.id,
    },
  });
  return { contractorId: createdRow.id, dedupeKey: normalized.dedupeKey, created: true };
}
