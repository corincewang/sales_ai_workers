import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/contractors — read-only list from DB (no scraping).
 * Query: zip (optional), q (optional name contains, case-insensitive).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const zip = searchParams.get("zip")?.trim();
  const q = searchParams.get("q")?.trim();

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
  };

  const contractors = await prisma.contractor.findMany({
    where,
    orderBy: [{ name: "asc" }],
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

  return NextResponse.json({ data: contractors });
}
