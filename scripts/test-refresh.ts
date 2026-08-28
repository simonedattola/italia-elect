/**
 * Test refresh — npm run test:refresh
 */
import { dailyRefresh } from "../src/lib/refresh/dailyRefresh";
import { loadLatestSnapshot } from "../src/lib/weights/factorCollector";

async function main() {
  console.log("\n=== Test Refresh Giornaliero ===\n");
  const snapshot = await dailyRefresh();
  const weights = await loadLatestSnapshot();

  console.log("✓ dailyRefresh completato");
  console.log(`  Data: ${snapshot.date}`);
  console.log(`  Agenti campione: ${snapshot.agentSampleSize}`);
  console.log(`  Pesi aggiornati: ${snapshot.weightsUpdatedAt}`);
  console.log(`  Lega: ${(snapshot.votingIntent["lega"] ?? 0).toFixed(1)}%`);
  console.log(`  FdI: ${(snapshot.votingIntent["fratelli-ditalia"] ?? 0).toFixed(1)}%`);
  if (weights) console.log(`  Fattori daily: ${Object.keys(weights.factors).length}`);
  console.log();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
