/**
 * Test generazione agenti — npm run test:agents
 */
import {
  generateAgentSample,
  summarizeDemographics,
  VIRTUAL_POPULATION,
} from "../src/lib/agents";

function expect(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
  console.log("✓", msg);
}

async function main() {
  console.log("\n=== Test Agenti (clonazione digitale) ===\n");
  const sampleSize = Number(process.env.AGENT_SAMPLE_SIZE ?? 5000);
  const agents = generateAgentSample(sampleSize, 42);
  const demo = summarizeDemographics(agents);

  expect(agents.length === sampleSize, `sample size ${sampleSize}`);
  expect(agents[0]!.virtualWeight === VIRTUAL_POPULATION / sampleSize, "scaling factor");
  expect(demo.femalePct > 48 && demo.femalePct < 56, `female ~52% (${demo.femalePct.toFixed(1)})`);
  expect(demo.avgAge > 40 && demo.avgAge < 58, `avg age plausible (${demo.avgAge.toFixed(1)})`);
  expect(demo.urbanPct > 25, `urban pct (${demo.urbanPct.toFixed(1)})`);

  console.log(`\nVirtual population: ${VIRTUAL_POPULATION.toLocaleString("it-IT")}`);
  console.log(`Sample: ${sampleSize.toLocaleString("it-IT")}`);
  console.log(`Demographics: F ${demo.femalePct.toFixed(1)}% · age ${demo.avgAge.toFixed(1)} · urban ${demo.urbanPct.toFixed(1)}%\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
