import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Deterministic seed keys for demo / Hour 1 (Hour 3 will compute from scrape). */
function dedupeKey(zip: string, name: string, suffix: string) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `seed:${zip}:${slug}:${suffix}`;
}

async function main() {
  const now = new Date();
  const contractors = [
    {
      dedupeKey: dedupeKey("10013", "Skyline Roofing NYC", "a"),
      name: "Skyline Roofing NYC",
      phone: "(212) 555-0101",
      website: "https://skylineroofing.example",
      address: "120 Canal St",
      city: "New York",
      state: "NY",
      zipCode: "10013",
      certificationLevel: "GAF Master Elite",
      lastSeenAt: now,
    },
    {
      dedupeKey: dedupeKey("10013", "Hudson Valley Exteriors", "b"),
      name: "Hudson Valley Exteriors",
      phone: "(212) 555-0102",
      website: "https://hudsonexteriors.example",
      address: "88 Lafayette St",
      city: "New York",
      state: "NY",
      zipCode: "10013",
      certificationLevel: "GAF Certified",
      lastSeenAt: now,
    },
    {
      dedupeKey: dedupeKey("10013", "Tribeca Tile & Roof Co", "c"),
      name: "Tribeca Tile & Roof Co",
      phone: null,
      website: "https://tribecaroof.example",
      address: "200 Broadway",
      city: "New York",
      state: "NY",
      zipCode: "10013",
      certificationLevel: null,
      lastSeenAt: now,
    },
    {
      dedupeKey: dedupeKey("10013", "Metro Flat Roofers", "d"),
      name: "Metro Flat Roofers",
      phone: "(646) 555-0199",
      website: null,
      address: null,
      city: "New York",
      state: "NY",
      zipCode: "10013",
      certificationLevel: "GAF Master Elite",
      lastSeenAt: now,
    },
    {
      dedupeKey: dedupeKey("10013", "Canal Street Builders", "e"),
      name: "Canal Street Builders",
      phone: "(212) 555-0140",
      website: "https://canalbuilders.example",
      address: "45 Canal St",
      city: "New York",
      state: "NY",
      zipCode: "10013",
      certificationLevel: "GAF Certified",
      lastSeenAt: now,
    },
    {
      dedupeKey: dedupeKey("10014", "West Side Roofing", "f"),
      name: "West Side Roofing",
      phone: "(212) 555-0200",
      website: null,
      address: "10 Bleecker St",
      city: "New York",
      state: "NY",
      zipCode: "10014",
      certificationLevel: "GAF Master Elite",
      lastSeenAt: now,
    },
    {
      dedupeKey: dedupeKey("10013", "Little Italy Roof Repair", "g"),
      name: "Little Italy Roof Repair",
      phone: null,
      website: null,
      address: "Mulberry St",
      city: "New York",
      state: "NY",
      zipCode: "10013",
      certificationLevel: null,
      lastSeenAt: now,
    },
    {
      dedupeKey: dedupeKey("10013", "SOHO Slate & Copper", "h"),
      name: "SOHO Slate & Copper",
      phone: "(917) 555-0177",
      website: "https://sohoslate.example",
      address: "375 West Broadway",
      city: "New York",
      state: "NY",
      zipCode: "10013",
      certificationLevel: "GAF Certified",
      lastSeenAt: now,
    },
  ];

  for (const row of contractors) {
    await prisma.contractor.upsert({
      where: { dedupeKey: row.dedupeKey },
      create: row,
      update: {
        name: row.name,
        phone: row.phone,
        website: row.website,
        address: row.address,
        city: row.city,
        state: row.state,
        zipCode: row.zipCode,
        certificationLevel: row.certificationLevel,
        lastSeenAt: row.lastSeenAt,
      },
    });
  }

  console.log(`Seeded ${contractors.length} contractors.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
