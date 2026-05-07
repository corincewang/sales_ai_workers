import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/contractors/:id — single contractor from DB.
 */
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

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

  return NextResponse.json({ data: contractor });
}
