/**
 * Test Micro-Sim — eletor generator + Roma stability.
 * Run: npm run test:microsim
 */

import { WeightsEngine } from "../../context/weightsEngine";
import { aggregateResults } from "../aggregator";
import { normalizePartySlug } from "../compatibility";
import {
  createRng,
  generateElectors,
  resolveBaselineShares,
} from "../electorGenerator";
import { simulateComune } from "../simulationEngine";
import { PARTIES } from "../../electoral/parties";

type TestFn = () => void | Promise<void>;

const suites: Array<{ name: string; tests: Array<{ name: string; fn: TestFn }> }> =
  [];
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
    toBeLessThan(n: number) {
      if (!(typeof actual === "number" && actual < n)) {
        throw new Error(`Expected ${String(actual)} < ${n}`);
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
    toBeTruthy() {
      if (!actual) throw new Error(`Expected truthy, got ${String(actual)}`);
    },
  };
}

describe("electorGenerator", () => {
  it("genera sampleSize elettori con affinity normalizzata", async () => {
    const rng = createRng(42);
    const electors = await generateElectors("058091", 100, rng);
    expect(electors.length).toBe(100);
    const e = electors[0]!;
    expect(e.comuneId).toBe("058091");
    expect(e.age).toBeGreaterThan(17);
    const sum = Object.values(e.partyAffinity).reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 1) > 0.02) {
      throw new Error(`affinity sum ${sum} not ~1`);
    }
    expect(Object.keys(e.partyAffinity).length).toBeGreaterThan(5);
  });

  it("baseline Roma 2022 ha FdI e PD", async () => {
    const shares = await resolveBaselineShares("058091", 2022);
    expect(shares["fratelli-ditalia"] ?? 0).toBeGreaterThan(20);
    expect(shares["partito-democratico"] ?? 0).toBeGreaterThan(15);
  });
});

describe("Micro-Simulatore", () => {
  it("dovrebbe simulare Roma in scenario stability", async () => {
    const weightsEngine = new WeightsEngine();
    const weights = await weightsEngine.computeWeights(
      "058091",
      new Date("2024-01-01"),
      "fdi",
      "stability",
    );

    const candidate = {
      name: "Giorgia Meloni",
      partySlug: "fdi",
      description:
        "Leader di Fratelli d'Italia, Presidente del Consiglio, centrodestra conservatore",
      profile: {
        partyCompatibility: 95,
        notoriety: 95,
        scandalRisk: 25,
        isPublicFigure: true,
        dataQuality: "high" as const,
      },
    };

    const result = await simulateComune({
      comuneId: "058091",
      candidate,
      scenario: { seed: 42, scenarioType: "stability" },
      weights,
      sampleSize: 2000,
      mode: "hybrid",
      targetDate: new Date("2022-09-25"),
    });

    const fdiSlug = normalizePartySlug("fdi");
    const fdiPct = result.partyVotes[fdiSlug] ?? 0;

    expect(fdiPct).toBeGreaterThan(20);
    expect(fdiPct).toBeLessThan(40);
    expect(result.winner).toBe(fdiSlug);
    expect(result.metadata.simulationTime).toBeLessThan(15000);
    expect(result.comuneName.toUpperCase().includes("ROMA")).toBeTruthy();
    expect(result.simulatedVoters).toBe(2000);
  });

  it("aggregazione nazionale coerente su un comune", async () => {
    const weightsEngine = new WeightsEngine();
    const weights = await weightsEngine.computeWeights(
      "058091",
      new Date("2024-01-01"),
      "pd",
      "stability",
    );

    const result = await simulateComune({
      comuneId: "058091",
      candidate: {
        name: "Candidato PD",
        partySlug: "partito-democratico",
        description: "Esponente Partito Democratico centrosinistra",
        profile: { partyCompatibility: 88, scandalRisk: 20 },
      },
      scenario: { seed: 7 },
      weights,
      sampleSize: 800,
    });

    const agg = aggregateResults([result]);
    const voteSum = Object.values(agg.nationalVotes).reduce((a, b) => a + b, 0);
    if (Math.abs(voteSum - 100) > 2) {
      throw new Error(`nationalVotes sum ${voteSum} not ~100`);
    }
    expect(agg.mapData.length).toBe(1);
    expect(agg.coalitions.length).toBeGreaterThan(0);
    expect(Object.keys(agg.winProbability).length).toBeGreaterThan(0);
  });

  it("normalizePartySlug mappa alias", () => {
    expect(normalizePartySlug("fdi")).toBe("fratelli-ditalia");
    expect(normalizePartySlug("pd")).toBe("partito-democratico");
    expect(PARTIES.some((p) => p.slug === "fratelli-ditalia")).toBeTruthy();
  });
});

async function main() {
  console.log("\n=== Test Micro-Simulatore (Fase 3) ===\n");

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

  // Example output Roma stability
  const weightsEngine = new WeightsEngine();
  const weights = await weightsEngine.computeWeights(
    "058091",
    new Date("2024-01-01"),
    "fdi",
    "stability",
  );
  const example = await simulateComune({
    comuneId: "058091",
    candidate: {
      name: "Giorgia Meloni",
      partySlug: "fdi",
      description: "Leader FdI, centrodestra",
      profile: { partyCompatibility: 95, scandalRisk: 25, isPublicFigure: true },
    },
    scenario: { seed: 42, scenarioType: "stability" },
    weights,
    sampleSize: 2000,
    mode: "hybrid",
    targetDate: new Date("2022-09-25"),
  });

  console.log("\nEsempio Roma · hybrid stability · seed=42 · n=2000");
  console.log(
    `  winner=${example.winner} margin=${example.winnerMargin.toFixed(2)}pp time=${example.metadata.simulationTime.toFixed(0)}ms`,
  );
  const top = Object.entries(example.partyVotes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  for (const [slug, pct] of top) {
    const ci = example.confidenceInterval[slug];
    console.log(
      `  ${slug.padEnd(24)} ${pct.toFixed(2)}%` +
        (ci ? `  CI95=[${ci[0]}, ${ci[1]}]` : ""),
    );
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
