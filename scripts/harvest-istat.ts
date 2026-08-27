/**
 * CLI: harvest ISTAT BES → src/data/istat/
 * Usage: npx tsx scripts/harvest-istat.ts [comuneId]
 */
import { harvestBes } from "../src/lib/harvester/istat";

async function main() {
  const comuneId = process.argv[2] || "058091";
  console.log("Harvest ISTAT BES per", comuneId);
  const result = await harvestBes({ comuneId });
  console.log("ok:", result.ok, "| indicators:", result.items.length);
  for (const w of result.warnings) console.log("  ⚠", w);
  for (const item of result.items.slice(0, 8)) {
    console.log(
      `  ${item.year} ${item.territoryCode} ${item.indicatorId} (${item.indicatorLabel}): ${item.value}`
    );
  }
  if (result.items.length > 8) {
    console.log(`  … +${result.items.length - 8} altri`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
