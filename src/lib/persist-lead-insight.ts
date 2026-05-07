import type { LeadInsight } from "@prisma/client";
import type { GenerateLeadInsightResult } from "@/lib/generate-lead-insight";
import { payloadToInsightJsonColumns } from "@/lib/lead-insight-schema";
import { prisma } from "@/lib/prisma";

/**
 * Appends a new `LeadInsight` row (historical runs keep prior rows — use latest in reads).
 * `generatedAt` uses DB default (`now()`).
 */
export async function persistLeadInsight(
  contractorId: string,
  result: GenerateLeadInsightResult,
): Promise<LeadInsight> {
  const { payload, modelVersion, promptVersion } = result;
  const json = payloadToInsightJsonColumns(payload);

  return prisma.leadInsight.create({
    data: {
      contractorId,
      summary: payload.summary,
      companyType: payload.companyType,
      priorityScore: payload.priorityScore,
      talkingPoints: json.talkingPoints,
      recommendedProducts: json.recommendedProducts,
      risks: json.risks,
      modelVersion,
      promptVersion,
    },
  });
}
