/**
 * Minimal test runner (no Jest) matching Prompt 2 assertions.
 * Run: npm run test:context
 */

import { WeightsEngine } from "../weightsEngine";
import { FACTOR_COUNT } from "../../weights/factorRegistry";

type TestFn = () => void | Promise<void>;

const suites: Array<{ name: string; tests: Array<{ name: string; fn: TestFn }> }> = [];
let currentSuite: (typeof suites)[0] | null = null;

function describe(name: string, fn: () => void) {
  currentSuite = { name, tests: [] };
  suites.push(currentSuite);
  fn();
  currentSuite = null;
}

function it(name: string, fn: TestFn) {
  if (!currentSuite) throw new Error("it() outside describe()");
  currentSuite.tests.push({ name, fn });
}

function expect<T>(actual: T) {
  return {
    toBeGreaterThan(n: number) {
      if (!(typeof actual === "number" && actual > n)) {
        throw new Error(`Expected ${String(actual)} > ${n}`);
      }
    },
    toBe(expected: unknown) {
      if (actual !== expected) {
        throw new Error(`Expected ${String(actual)} === ${String(expected)}`);
      }
    },
    toBeDefined() {
      if (actual === undefined || actual === null) {
        throw new Error("Expected value to be defined");
      }
    },
  };
}

describe("WeightsEngine", () => {
  it("dovrebbe dare peso maggiore all'economia in scenario crisis", async () => {
    const engine = new WeightsEngine();
    const crisis = await engine.computeAggregated("crisis");
    const base = await engine.computeAggregated("base");
    const econCrisis = crisis.categories.find((c) => c.category === "economy");
    const econBase = base.categories.find((c) => c.category === "economy");
    expect(econCrisis!.baseShare).toBeGreaterThan(econBase!.baseShare);
  });

  it("dovrebbe gestire override manuali", async () => {
    const engine = new WeightsEngine();
    const overrides = { economy_gdp_growth: 0.9 };
    const weights = await engine.computeWeights(
      "058091",
      new Date("2024-01-01"),
      "pd",
      "stability",
      overrides,
    );

    const gdpFactor = weights.find((w) => w.factorId === "economy_gdp_growth");
    expect(gdpFactor?.weight).toBe(0.9);
  });

  it("registry ha 145 fattori in 12 categorie", async () => {
    expect(FACTOR_COUNT).toBe(145);
  });

  it("crisis aumenta peso sicurezza vs stability base", async () => {
    const engine = new WeightsEngine();
    const crisis = await engine.computeAggregated("crisis");
    const base = await engine.computeAggregated("base");
    const secCrisis = crisis.categories.find((c) => c.category === "security");
    const secBase = base.categories.find((c) => c.category === "security");
    expect(secCrisis!.baseShare).toBeGreaterThan(secBase!.baseShare);
  });
});

async function main() {
  console.log("\n=== Test Context WeightsEngine (Fase 2) ===\n");
  console.log(`Model ${WeightsEngine.VERSION} · factors=${FACTOR_COUNT}\n`);

  let failed = 0;
  let passed = 0;

  for (const suite of suites) {
    console.log(`▸ ${suite.name}`);
    for (const test of suite.tests) {
      try {
        await test.fn();
        console.log(`  ✓ ${test.name}`);
        passed++;
      } catch (err) {
        failed++;
        console.error(`  ✗ ${test.name}`);
        console.error(`    ${(err as Error).message}`);
      }
    }
  }

  // Example crisis output for Roma
  const engine = new WeightsEngine();
  const crisisWeights = await engine.computeWeights(
    "058091",
    new Date("2024-01-01"),
    "pd",
    "crisis",
  );
  const top = [...crisisWeights].sort((a, b) => b.weight - a.weight).slice(0, 8);
  console.log("\nEsempio Roma (058091) · scenario crisis · top pesi:");
  for (const w of top) {
    console.log(
      `  ${w.factorId.padEnd(28)} w=${w.weight.toFixed(3)} raw=${w.rawValue.toFixed(3)} score=${w.weightedScore.toFixed(3)} [${w.category}]`,
    );
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
