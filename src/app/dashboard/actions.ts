"use server";

import { batchGenerateLeadInsightsForContractorIds } from "@/lib/batch-generate-lead-insights";
import { prisma } from "@/lib/prisma";

const MAX_WARM = 25;

/**
 * Server-side batch insight generation for dashboard cold start (no client secret).
 * Respects `onlyMissing` so re-entry is cheap. Cap `contractorIds` for safety.
 */
export type WarmBatchInsightsResult =
  | {
      ok: true;
      summary: { ok: number; skipped: number; error: number };
    }
  | {
      ok: false;
      error: string;
      summary: { ok: 0; skipped: 0; error: 0 };
    };

export async function warmBatchInsights(contractorIds: string[]): Promise<WarmBatchInsightsResult> {
  const emptySummary = { ok: 0, skipped: 0, error: 0 } as const;

  try {
    const unique = [...new Set(contractorIds.filter(Boolean))].slice(0, MAX_WARM);
    if (unique.length === 0) {
      return { ok: true as const, summary: { ...emptySummary } };
    }

    const { results } = await batchGenerateLeadInsightsForContractorIds(prisma, unique, {
      onlyMissing: true,
    });

    return {
      ok: true as const,
      summary: {
        ok: results.filter((r) => r.status === "ok").length,
        skipped: results.filter((r) => r.status === "skipped").length,
        error: results.filter((r) => r.status === "error").length,
      },
    };
  } catch (err) {
    console.error("warmBatchInsights", err);
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false as const,
      error: message,
      summary: { ok: 0, skipped: 0, error: 0 },
    };
  }
}
