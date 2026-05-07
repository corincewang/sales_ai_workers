import type { PrismaClient } from "@prisma/client";

import { GenerateLeadInsightError, generateLeadInsight } from "@/lib/generate-lead-insight";
import { persistLeadInsight } from "@/lib/persist-lead-insight";

const FACTS_SELECT = {
  id: true,
  name: true,
  phone: true,
  website: true,
  address: true,
  city: true,
  state: true,
  zipCode: true,
  certificationLevel: true,
} as const;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type BatchInsightOptions = {
  /** Milliseconds between OpenAI calls (politeness + rate limits). */
  delayMs?: number;
  /** If true, skip contractors that already have at least one LeadInsight row. */
  onlyMissing?: boolean;
};

export type BatchInsightItemOk = { contractorId: string; insightId: string; status: "ok" };
export type BatchInsightItemSkip = { contractorId: string; status: "skipped"; reason: string };
export type BatchInsightItemErr = {
  contractorId: string;
  status: "error";
  code: string;
  message: string;
};

export type BatchInsightItemResult = BatchInsightItemOk | BatchInsightItemSkip | BatchInsightItemErr;

function classifyInsightError(err: unknown): { code: string; message: string } {
  if (err instanceof GenerateLeadInsightError) {
    const msg = err.message;
    if (msg.includes("OPENAI_API_KEY")) return { code: "MISSING_OPENAI_KEY", message: msg };
    return { code: "INSIGHT_FAILED", message: msg };
  }
  return { code: "UNEXPECTED", message: err instanceof Error ? err.message : String(err) };
}

/**
 * Sequential insight generation with delay between requests (demo-safe rate limiting).
 * Preserves input order in `results`.
 */
export async function batchGenerateLeadInsightsForContractorIds(
  db: PrismaClient,
  contractorIds: string[],
  options: BatchInsightOptions = {},
): Promise<{ results: BatchInsightItemResult[] }> {
  const delayRaw = options.delayMs ?? Number(process.env.GAF_INSIGHT_DELAY_MS ?? "1200");
  const delayMs = Number.isFinite(delayRaw) ? Math.max(0, Math.floor(delayRaw)) : 1200;
  const onlyMissing = options.onlyMissing ?? true;

  const uniqueIds = [...new Set(contractorIds.filter(Boolean))];
  let hasInsightSet = new Set<string>();

  if (onlyMissing && uniqueIds.length > 0) {
    const withInsight = await db.contractor.findMany({
      where: {
        id: { in: uniqueIds },
        insights: { some: {} },
      },
      select: { id: true },
    });
    hasInsightSet = new Set(withInsight.map((r) => r.id));
  }

  const results: BatchInsightItemResult[] = [];
  let openAiCalls = 0;

  for (const contractorId of uniqueIds) {
    if (onlyMissing && hasInsightSet.has(contractorId)) {
      results.push({ contractorId, status: "skipped", reason: "already_has_insight" });
      continue;
    }

    if (openAiCalls > 0 && delayMs > 0) {
      await sleep(delayMs);
    }

    const contractor = await db.contractor.findUnique({
      where: { id: contractorId },
      select: FACTS_SELECT,
    });

    if (!contractor) {
      results.push({
        contractorId,
        status: "error",
        code: "NOT_FOUND",
        message: "Contractor not found",
      });
      continue;
    }

    try {
      const gen = await generateLeadInsight(contractor);
      const insight = await persistLeadInsight(contractor.id, gen);
      results.push({ contractorId, insightId: insight.id, status: "ok" });
      openAiCalls += 1;
    } catch (err) {
      const { code, message } = classifyInsightError(err);
      results.push({ contractorId, status: "error", code, message });
      openAiCalls += 1;
    }
  }

  return { results };
}
