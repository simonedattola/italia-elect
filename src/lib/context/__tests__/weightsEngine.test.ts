/**
 * Minimal test runner (no Jest) matching Prompt 2 assertions.
 * Run: npm run test:context
 */

import { WeightsEngine } from "../weightsEngine";
import { FACTORS } from "../factorRegistry";

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
    const weights = await engine.computeWeights(
      "058091", // Roma
      new Date("2024-01-01"),
      "pd",
      "crisis",
    );

    const economyWeights = weights.filter((w) => w.category === "economy");
    const avgEconomyWeight =
      economyWeights.reduce((s, w) => s + w.weight, 0) / economyWeights.length;

    // In scenario crisis, il peso medio dell'economia dovrebbe essere > 0.4
    expect(avgEconomyWeight).toBeGreaterThan(0.4);
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

  it("registry ha almeno 20 fattori e tutte le categorie", async () => {
    expect(FACTORS.length).toBeGreaterThan(19);
    const cats = new Set(FACTORS.map((f) => f.category));
    for (const c of [
      "economy",
      "polls",
      "social",
      "news",
      "historical",
      "demographic",
    ] as const) {
      if (!cats.has(c)) throw new Error(`Missing category ${c}`);
    }
  });

  it("stability privilegia historical/demographic vs crisis economy", async () => {
    const engine = new WeightsEngine();
    const crisis = await engine.computeWeights(
      "058091",
      new Date("2024-01-01"),
      "pd",
      "crisis",
    );
    const stability = await engine.computeWeights(
      "058091",
      new Date("2024-01-01"),
      "pd",
      "stability",
    );

    const avg = (rows: typeof crisis, cat: string) => {
      const xs = rows.filter((w) => w.category === cat);
      return xs.reduce((s, w) => s + w.weight, 0) / Math.max(1, xs.length);
    };

    expect(avg(crisis, "economy")).toBeGreaterThan(avg(stability, "economy"));
    expect(avg(stability, "historical")).toBeGreaterThan(
      avg(crisis, "historical"),
    );
  });
});

async function main() {
  console.log("\n=== Test Context WeightsEngine (Fase 2) ===\n");
  console.log(`Model ${WeightsEngine.VERSION} · factors=${FACTORS.length}\n`);

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
