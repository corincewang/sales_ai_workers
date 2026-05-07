import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/contractors — read-only list from DB (no scraping).
 * Query: zip (optional), q (optional name contains, case-insensitive),
 * excludeSeed (optional) — when true, omit rows whose `dedupeKey` starts with `seed:` (Hour 1 demo rows).
 * Pagination: pass `limit` (1–100, default 20) and optionally `skip` (default 0). Omit both `limit` and `skip` to return the full list (legacy).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const zip = searchParams.get("zip")?.trim();
    const q = searchParams.get("q")?.trim();
    const excludeSeed =
      searchParams.get("excludeSeed") === "1" ||
      searchParams.get("excludeSeed") === "true";

    const paged =
      searchParams.has("limit") ||
      searchParams.has("skip") ||
      searchParams.get("paged") === "1";

    const where = {
      ...(zip ? { zipCode: zip } : {}),
      ...(q
        ? {
            name: {
              contains: q,
              mode: "insensitive" as const,
            },
          }
        : {}),
      ...(excludeSeed
        ? {
            NOT: {
              dedupeKey: { startsWith: "seed:" },
            },
          }
        : {}),
    };

    const select = {
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
    } as const;

    const orderBy = [{ lastSeenAt: "desc" as const }, { name: "asc" as const }];

    if (!paged) {
      const contractors = await prisma.contractor.findMany({
        where,
        orderBy,
        select,
      });
      return NextResponse.json({ data: contractors });
    }

    const limitRaw = searchParams.get("limit");
    const skipRaw = searchParams.get("skip");
    const limit = Math.min(
      100,
      Math.max(1, Math.floor(Number(limitRaw ?? 20) || 20)),
    );
    const skip = Math.max(0, Math.floor(Number(skipRaw ?? 0) || 0));

    const [contractors, total] = await Promise.all([
      prisma.contractor.findMany({
        where,
        orderBy,
        select,
        skip,
        take: limit,
      }),
      prisma.contractor.count({ where }),
    ]);

    const hasMore = skip + contractors.length < total;

    return NextResponse.json({
      data: contractors,
      meta: { skip, limit, total, hasMore },
    });
  } catch (err) {
    console.error("GET /api/contractors", err);
    const message = err instanceof Error ? err.message : "Query failed";
    return NextResponse.json({ error: message, code: "CONTRACTORS_QUERY_FAILED" }, { status: 500 });
  }
}
