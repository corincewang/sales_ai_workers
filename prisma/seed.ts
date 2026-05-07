import { PrismaClient } from "@prisma/client";
import type { InputJsonValue } from "@prisma/client/runtime/library";

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

/**
 * Real GAF listing URLs — raw JSON mirrors public page sections (scheme A).
 * Content is summarized from the same public pages (business info is directory data).
 */
const GAF_PUBLIC_SEEDS: {
  sourceUrl: string;
  dedupeKey: string;
  contractor: {
    name: string;
    phone: string;
    website: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    certificationLevel: string;
  };
  rawData: Record<string, unknown>;
}[] = [
  {
    sourceUrl:
      "https://www.gaf.com/en-us/roofing-contractors/residential/usa/nj/elmwood-park/donnys-home-improvement-1139561",
    dedupeKey: "gaf:1139561",
    contractor: {
      name: "Donny's Home Improvement",
      phone: "(973) 333-6364",
      website: "https://www.donnysroofing.com/",
      address: "30 16th Ave",
      city: "Elmwood Park",
      state: "NJ",
      zipCode: "07407",
      certificationLevel: "GAF Master Elite",
    },
    rawData: {
      aboutUs: {
        headline: "About",
        body:
          "Established in 2002, Donny's Home Improvement is a home improvement company that has built a reputable name for quality workmanship and superior services. Licensed and insured, you can trust our highly skilled specialists will provide you with top-notch results and a worry-free experience. Based in the state of NJ, our locally owned and operated business will cater to your needs, giving you personalized care as our valued client. With us, you can rest assured that the job will be done with skill and precision. We are detail-oriented, responsible, honest, prompt and affordable. We also offer various roofing options to suit your budget and style preferences, including asphalt shingles, metal roofing, and rubber roofing. If you have a property in need of professional home improvement services, contact us today. We will provide a clear and timely estimate and get the job done quickly. Donny's Home Improvement is your reliable service in the state of New Jersey with affordable rates and discounts for qualified buyers and veterans. Call us today.",
      },
      certification: {
        awards: ["President's Club Award"],
        programs: ["GAF Master Elite®"],
      },
      contractorDetails: {
        yearsInBusiness: "In business since 2002",
        numberOfEmployees: "More than 5",
        contractorId: "1139561",
        stateLicenseNumber: "13VH12121100",
      },
      reviews: {
        rating: 5,
        count: 116,
        summary: "Aggregate rating shown on directory; detailed list may load separately in browser.",
      },
      meta: {
        gafContractorId: "1139561",
        seedOrigin: "prisma-seed",
        pageKind: "residential-contractor-detail",
      },
    },
  },
  {
    sourceUrl:
      "https://www.gaf.com/en-us/roofing-contractors/residential/usa/nj/florham-park/american-home-contractors-inc-1005149",
    dedupeKey: "gaf:1005149",
    contractor: {
      name: "American Home Contractors Inc",
      phone: "(908) 771-0123",
      website: "https://njahc.com/",
      address: "124 Crescent Rd",
      city: "Florham Park",
      state: "NJ",
      zipCode: "07932",
      certificationLevel: "GAF Master Elite",
    },
    rawData: {
      aboutUs: {
        headline: "About",
        body:
          "American Home Contractors is a full service Roofing, Windows, and Siding company. Our commitment to detailed workmanship, quality products and responsive service has helped build our excellent reputation with homeowners in the past 15 years. As one of the leading siding, roofing and windows contractors in New Jersey, we understand that Your Satisfaction Means Everything. Our commitment is on our customer's 100% satisfaction, and will strive to exceed your expectations. Conveniently located in Florham Park NJ, American Home Contractors has become the destination for top-quality window, roofing, and siding solutions for New Jersey homes. Please contact us to schedule a free, in-home consultation and learn more about our superior difference. CALL US AT (908) 771-0123 TO SCHEDULE YOUR FREE CONSULTATION!",
      },
      certification: {
        awards: ["President's Club Award"],
        programs: ["GAF Master Elite®"],
      },
      contractorDetails: {
        yearsInBusiness: "In business since 2009",
        contractorId: "1005149",
        stateLicenseNumber: "13VH05517600",
      },
      reviews: {
        rating: 5,
        count: 265,
        summary: "Aggregate rating shown on directory; detailed list may load separately in browser.",
      },
      meta: {
        gafContractorId: "1005149",
        seedOrigin: "prisma-seed",
        pageKind: "residential-contractor-detail",
      },
    },
  },
];

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

  console.log(`Seeded ${contractors.length} demo contractors.`);

  const gafUrls = GAF_PUBLIC_SEEDS.map((s) => s.sourceUrl);
  await prisma.rawLeadSource.deleteMany({
    where: { sourceUrl: { in: gafUrls } },
  });

  for (const gaf of GAF_PUBLIC_SEEDS) {
    const contractor = await prisma.contractor.upsert({
      where: { dedupeKey: gaf.dedupeKey },
      create: {
        dedupeKey: gaf.dedupeKey,
        name: gaf.contractor.name,
        phone: gaf.contractor.phone,
        website: gaf.contractor.website,
        address: gaf.contractor.address,
        city: gaf.contractor.city,
        state: gaf.contractor.state,
        zipCode: gaf.contractor.zipCode,
        certificationLevel: gaf.contractor.certificationLevel,
        lastSeenAt: now,
      },
      update: {
        name: gaf.contractor.name,
        phone: gaf.contractor.phone,
        website: gaf.contractor.website,
        address: gaf.contractor.address,
        city: gaf.contractor.city,
        state: gaf.contractor.state,
        zipCode: gaf.contractor.zipCode,
        certificationLevel: gaf.contractor.certificationLevel,
        lastSeenAt: now,
      },
    });

    await prisma.rawLeadSource.create({
      data: {
        sourceName: "GAF",
        sourceUrl: gaf.sourceUrl,
        rawData: gaf.rawData as InputJsonValue,
        scrapedAt: now,
        contractorId: contractor.id,
      },
    });
  }

  console.log(`Seeded ${GAF_PUBLIC_SEEDS.length} GAF RawLeadSource rows + linked contractors.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
