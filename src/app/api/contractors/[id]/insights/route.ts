import {
  APIConnectionTimeoutError,
  APIError,
  AuthenticationError,
  RateLimitError,
} from "openai";
import { NextResponse } from "next/server";
import { GenerateLeadInsightError, generateLeadInsight } from "@/lib/generate-lead-insight";
import { persistLeadInsight } from "@/lib/persist-lead-insight";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

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

/**
 * POST /api/contractors/:id/insights — generate via OpenAI, validate, append `LeadInsight`.
 */
export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  const contractor = await prisma.contractor.findUnique({
    where: { id },
    select: FACTS_SELECT,
  });

  if (!contractor) {
    return NextResponse.json({ error: "Contractor not found" }, { status: 404 });
  }

  try {
    const result = await generateLeadInsight(contractor);
    const insight = await persistLeadInsight(contractor.id, result);
    return NextResponse.json({ data: insight }, { status: 201 });
  } catch (err) {
    if (err instanceof GenerateLeadInsightError) {
      const cause = err.cause;

      if (err.message.includes("OPENAI_API_KEY")) {
        return NextResponse.json(
          {
            error: "Insight service misconfigured: missing OPENAI_API_KEY",
            code: "MISSING_OPENAI_KEY",
          },
          { status: 503 },
        );
      }

      if (cause instanceof RateLimitError) {
        return NextResponse.json(
          { error: "OpenAI rate limit exceeded", code: "RATE_LIMIT" },
          { status: 429 },
        );
      }

      if (cause instanceof APIConnectionTimeoutError) {
        return NextResponse.json(
          { error: "OpenAI request timed out", code: "TIMEOUT" },
          { status: 504 },
        );
      }

      if (cause instanceof AuthenticationError) {
        return NextResponse.json(
          { error: "OpenAI authentication failed", code: "OPENAI_AUTH" },
          { status: 502 },
        );
      }

      if (cause instanceof APIError) {
        return NextResponse.json(
          {
            error: cause.message,
            code: "OPENAI_ERROR",
            openaiStatus: cause.status,
          },
          { status: 502 },
        );
      }

      const invalidOutput =
        err.message.includes("Model JSON failed validation") ||
        err.message.includes("was not valid JSON") ||
        err.message.includes("empty response");

      return NextResponse.json(
        { error: err.message, code: invalidOutput ? "INVALID_MODEL_OUTPUT" : "INSIGHT_FAILED" },
        { status: 502 },
      );
    }

    console.error("POST /api/contractors/[id]/insights", err);
    return NextResponse.json(
      { error: "Unexpected error generating insight" },
      { status: 500 },
    );
  }
}
