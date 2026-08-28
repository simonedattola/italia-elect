/**
 * Test sistema pesi dinamici 145 fattori.
 * Run: npm run test:weights
 */

import { WeightsEngine } from "../src/lib/context/weightsEngine";
import { FACTOR_COUNT, FACTORS } from "../src/lib/weights/factorRegistry";
import {
  computeFactorDynamicWeight,
  computeAggregatedWeights,
} from "../src/lib/weights/dynamicWeights";
import { validateFactorCoverage } from "../src/lib/weights/weightAggregator";
import {
  collectFactors,
  refreshDailyFactors,
  saveDailySnapshot,
} from "../src/lib/weights/factorCollector";
import { CATEGORY_SCENARIO_WEIGHTS } from "../src/lib/weights/categoryConfig";

type TestFn = () => void | Promise<void>;
const suites: Array<{ name: string; tests: Array<{ name: string; fn: TestFn }> }> =
  [];
let current: (typeof suites)[0] | null = null;

function describe(name: string, fn: () => void) {
  current = { name, tests: [] };
  suites.push(current);
  fn();
  current = null;
}
function it(name: string, fn: TestFn) {
  if (!current) throw new Error("it outside describe");
  current.tests.push({ name, fn });
}
function expect<T>(actual: T) {
  return {
    toBe(expected: unknown) {
      if (actual !== expected) throw new Error(`Expected ${String(actual)} === ${String(expected)}`);
    },
    toBeGreaterThan(n: number) {
      if (!(typeof actual === "number" && actual > n)) {
        throw new Error(`Expected ${String(actual)} > ${n}`);
      }
    },
    toBeLessThan(n: number) {
      if (!(typeof actual === "number" && actual < n)) {
        throw new Error(`Expected ${String(actual)} < ${n}`);
      }
    },
  };
}

describe("Factor registry", () => {
  it("contiene esattamente 145 fattori", () => {
    expect(FACTOR_COUNT).toBe(145);
    expect(FACTORS.length).toBe(145);
  });

  it("copre 12 categorie", () => {
    const cats = new Set(FACTORS.map((f) => f.category));
    expect(cats.size).toBe(12);
  });
});

describe("Formula dinamica", () => {
  it("aumenta peso quando valore sopra media (inflazione)", async () => {
    const inflation = FACTORS.find((f) => f.id === "economy_inflazione_ipc");
    if (!inflation) throw new Error("missing inflation factor");
    const baseline = 0.015;
    const low = computeFactorDynamicWeight(inflation, 1.5, baseline);
    const high = computeFactorDynamicWeight(inflation, 4.0, baseline);
    expect(high.dynamicWeight).toBeGreaterThan(low.dynamicWeight);
  });

  it("scenario crisi aumenta peso economia vs base", async () => {
    const snapshot = await collectFactors();
    const base = computeAggregatedWeights(snapshot, "base");
    const crisis = computeAggregatedWeights(snapshot, "crisis");
    const econBase = base.categories.find((c) => c.category === "economy");
    const econCrisis = crisis.categories.find((c) => c.category === "economy");
    expect(econCrisis!.baseShare).toBeGreaterThan(econBase!.baseShare);
    expect(
      CATEGORY_SCENARIO_WEIGHTS.crisis.economy,
    ).toBe(40);
  });
});

describe("Collector giornaliero", () => {
  it("raccoglie tutti i fattori e salva snapshot", async () => {
    const snapshot = await refreshDailyFactors();
    const coverage = validateFactorCoverage(snapshot);
    expect(coverage.total).toBe(145);
    expect(coverage.covered).toBe(145);
    await saveDailySnapshot(snapshot);
  });
});

describe("WeightsEngine integrazione", () => {
  it("computeWeights restituisce fattori legacy per simulazione", async () => {
    const engine = new WeightsEngine();
    const weights = await engine.computeWeights(
      "058091",
      new Date("2024-01-01"),
      "pd",
      "crisis",
    );
    expect(weights.length).toBeGreaterThan(20);
    const economy = weights.filter((w) => w.category === "economy");
    expect(economy.length).toBeGreaterThan(4);
  });

  it("override manuale su fattore legacy", async () => {
    const engine = new WeightsEngine();
    const overrides = { economy_gdp_growth: 0.9 };
    const weights = await engine.computeWeights(
      "058091",
      new Date("2024-01-01"),
      "pd",
      "base",
      overrides,
    );
    const row = weights.find((w) => w.factorId === "economy_gdp_growth");
    expect(row?.weight).toBe(0.9);
  });
});

async function main() {
  console.log("\n=== Test Weights 145 fattori ===\n");
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

  const engine = new WeightsEngine();
  const agg = await engine.computeAggregated("crisis");
  console.log("\nTop 5 fattori (crisi):");
  const top = [...agg.factors].sort((a, b) => b.dynamicWeight - a.dynamicWeight).slice(0, 5);
  for (const f of top) {
    console.log(
      `  ${f.factorName} · w=${f.dynamicWeight.toFixed(4)} · cat=${f.category}`,
    );
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
