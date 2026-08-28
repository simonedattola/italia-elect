/**
 * Test generator elettori — incluso anche in simulationEngine.test.ts.
 * Run standalone: npx tsx src/lib/microsim/tests/electorGenerator.test.ts
 */

import {
  createRng,
  generateElectors,
  sampleFromDistribution,
} from "../electorGenerator";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log("✓", msg);
}

async function main() {
  console.log("\n=== Test electorGenerator ===\n");
  const rng = createRng(1);
  assert(sampleFromDistribution({ a: 1 }, rng) === "a", "sample dist singleton");
  const electors = await generateElectors("058091", 50, createRng(99));
  assert(electors.length === 50, "sampleSize 50");
  assert(electors.every((e) => e.age >= 18 && e.age <= 92), "età 18–92");
  assert(
    electors.every((e) => {
      const s = Object.values(e.partyAffinity).reduce((a, b) => a + b, 0);
      return Math.abs(s - 1) < 0.02;
    }),
    "affinity normalizzata",
  );
  console.log("\nOK\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
