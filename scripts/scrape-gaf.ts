import "dotenv/config";

import { batchGenerateLeadInsightsForContractorIds } from "../src/lib/batch-generate-lead-insights";
import { prisma } from "../src/lib/prisma";
import { runGafCoveoResidentialScrape } from "../src/lib/scrape/run-gaf-scrape";

async function main() {
  console.log("Fetching GAF residential list via Coveo…");
  const scrape = await runGafCoveoResidentialScrape(prisma);
  console.log(
    `totalCount=${scrape.totalCount ?? "?"} parsedHits=${scrape.hitsParsed} (requested page size from env)`,
  );
  console.log(`Upsert done: created=${scrape.created} updated=${scrape.updated}`);

  const genInsights =
    process.env.GAF_SCRAPE_GENERATE_INSIGHTS === "1" ||
    process.env.GAF_SCRAPE_GENERATE_INSIGHTS === "true";
  if (genInsights) {
    const onlyMissing = process.env.GAF_SCRAPE_INSIGHTS_REGENERATE !== "1";
    const ids = scrape.upserts.map((u) => u.contractorId);
    console.log(
      `Generating insights (onlyMissing=${onlyMissing}, n=${ids.length}) with GAF_INSIGHT_DELAY_MS…`,
    );
    const { results } = await batchGenerateLeadInsightsForContractorIds(prisma, ids, {
      onlyMissing,
    });
    const ok = results.filter((r) => r.status === "ok").length;
    const skipped = results.filter((r) => r.status === "skipped").length;
    const err = results.filter((r) => r.status === "error").length;
    console.log(`Insights: ok=${ok} skipped=${skipped} error=${err}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
