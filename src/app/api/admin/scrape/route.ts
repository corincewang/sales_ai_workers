import { NextResponse } from "next/server";

import {
  adminMutationsConfigError,
  isAdminMutationAuthorized,
} from "@/lib/admin-request-auth";
import { batchGenerateLeadInsightsForContractorIds } from "@/lib/batch-generate-lead-insights";
import { prisma } from "@/lib/prisma";
import { runGafCoveoResidentialScrape } from "@/lib/scrape/run-gaf-scrape";

export const maxDuration = 300;

type ScrapeBody = {
  pageSize?: number;
  generateInsights?: boolean;
  /** Default true when generateInsights is on: skip contractors that already have any LeadInsight. */
  onlyMissingInsights?: boolean;
  insightDelayMs?: number;
};

/**
 * POST /api/admin/scrape — demo-only: Coveo list → upsert contractors (+ optional batched OpenAI insights).
 * Guard with `SCRAPE_ADMIN_SECRET` + header `x-admin-scrape-secret` in production; dev allows unset secret.
 */
export async function POST(request: Request) {
  const gate = adminMutationsConfigError();
  if (gate) return gate;

  if (!isAdminMutationAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  let body: ScrapeBody = {};
  try {
    const text = await request.text();
    if (text.trim()) body = JSON.parse(text) as ScrapeBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const pageSize =
    body.pageSize !== undefined && Number.isFinite(body.pageSize)
      ? Math.min(200, Math.max(1, Math.floor(body.pageSize)))
      : undefined;

  try {
    const scrape = await runGafCoveoResidentialScrape(prisma, { pageSize });

    let insights:
      | {
          onlyMissing: boolean;
          results: Awaited<
            ReturnType<typeof batchGenerateLeadInsightsForContractorIds>
          >["results"];
          summary: { ok: number; skipped: number; error: number };
        }
      | undefined;

    if (body.generateInsights) {
      const contractorIds = scrape.upserts.map((u) => u.contractorId);
      const onlyMissing = body.onlyMissingInsights !== false;
      const { results } = await batchGenerateLeadInsightsForContractorIds(prisma, contractorIds, {
        delayMs: body.insightDelayMs,
        onlyMissing,
      });
      const summary = {
        ok: results.filter((r) => r.status === "ok").length,
        skipped: results.filter((r) => r.status === "skipped").length,
        error: results.filter((r) => r.status === "error").length,
      };
      insights = { onlyMissing, results, summary };
    }

    return NextResponse.json(
      {
        data: {
          scrape: {
            totalCount: scrape.totalCount,
            hitsParsed: scrape.hitsParsed,
            created: scrape.created,
            updated: scrape.updated,
          },
          insights,
        },
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("POST /api/admin/scrape", err);
    const message = err instanceof Error ? err.message : "Scrape failed";
    return NextResponse.json({ error: message, code: "SCRAPE_FAILED" }, { status: 502 });
  }
}
