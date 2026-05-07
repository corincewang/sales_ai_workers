import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

function parseInclude(raw: string | null): Set<string> {
  if (!raw?.trim()) return new Set();
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

/**
 * GET /api/contractors/:id — single contractor from DB.
 * Query: `include=latestInsight` — attach most recent `LeadInsight` (by `generatedAt`).
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const include = parseInclude(searchParams.get("include"));
    const withLatestInsight = include.has("latestInsight");

    const contractor = await prisma.contractor.findUnique({
      where: { id },
      select: {
        id: true,
        dedupeKey: true,
        name: true,
        phone: true,
        website: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        certificationLevel: true,
        lastSeenAt: true,
      },
    });

    if (!contractor) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!withLatestInsight) {
      return NextResponse.json({ data: contractor });
    }

    const latestInsight = await prisma.leadInsight.findFirst({
      where: { contractorId: id },
      orderBy: { generatedAt: "desc" },
    });

    return NextResponse.json({
      data: { ...contractor, latestInsight },
    });
  } catch (err) {
    console.error("GET /api/contractors/[id]", err);
    const message = err instanceof Error ? err.message : "Query failed";
    return NextResponse.json({ error: message, code: "CONTRACTOR_QUERY_FAILED" }, { status: 500 });
  }
}
