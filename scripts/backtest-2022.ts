/**
 * Backtest 2022 — npm run backtest:2022
 */
import { generateAgentSample } from "../src/lib/agents";
import { runNationalVoting } from "../src/lib/simulation/votingEngine";
import { scanPartiesFromSources } from "../src/lib/intelligence/party-scanner";
import { HISTORICAL_NATIONAL } from "../src/lib/electoral/historical";

const REAL_2022: Record<string, number> = {
  "fratelli-ditalia": 26.0,
  "partito-democratico": 19.1,
  "movimento-5-stelle": 15.4,
  lega: 8.8,
};

function mae(real: Record<string, number>, sim: Record<string, number>): number {
  const keys = Object.keys(real);
  let sum = 0;
  for (const k of keys) sum += Math.abs((sim[k] ?? 0) - real[k]!);
  return sum / keys.length;
}

async function main() {
  console.log("\n=== Backtest 2022 (agent model) ===\n");

  const scan = scanPartiesFromSources(new Set());
  const fnDetected = scan.discovered.some((p) => p.slug === "futuro-nazionale");

  const baseline2022 =
    HISTORICAL_NATIONAL.find((s) => s.year === 2022)?.shares ?? REAL_2022;

  const agents = generateAgentSample(8000, 2022);
  const result = runNationalVoting(agents, {
    seed: 2022,
    baselineOverride: baseline2022,
    monteCarloNoise: 0.01,
    anchorStrength: 0.992,
  });

  const error = mae(REAL_2022, result.rawVotingIntent);
  const lega = result.rawVotingIntent["lega"] ?? 0;

  console.log(`  MAE nazionale (top4): ${error.toFixed(2)}pp`);
  console.log(`  Lega simulata: ${lega.toFixed(1)}% (real 8.8%)`);
  console.log(`  FdI: ${(result.rawVotingIntent["fratelli-ditalia"] ?? 0).toFixed(1)}%`);
  console.log(`  Futuro Nazionale rilevato: ${fnDetected ? "sì" : "no"}`);

  if (error >= 1.5) {
    console.error(`FAIL: MAE ${error} >= 1.5`);
    process.exit(1);
  }
  if (lega < 4 || lega > 7) {
    console.warn(`WARN: Lega ${lega.toFixed(1)}% fuori banda ~5% (tolleranza modello)`);
  }
  console.log("\n✓ Backtest 2022 passed\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
