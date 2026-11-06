import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyScenarioStack, SCENARIO_STACK_CAP } from "./apply";
import { SCENARIO_PRESETS } from "./library";
import { assessLeader } from "@/lib/figures/assess";

const lists = [
  { id: "fratelli-ditalia", ideology: 0.72 },
  { id: "lega", ideology: 0.66 },
  { id: "futuro-nazionale", ideology: 0.78 },
  { id: "forza-italia", ideology: 0.35 },
  { id: "partito-democratico", ideology: -0.35 },
  { id: "avss", ideology: -0.7 },
  { id: "movimento-5-stelle", ideology: -0.1 },
  { id: "piu-europa", ideology: -0.05 },
];

const baseline: Record<string, number> = {
  "fratelli-ditalia": 28,
  lega: 6,
  "futuro-nazionale": 7,
  "forza-italia": 7,
  "partito-democratico": 20,
  avss: 6,
  "movimento-5-stelle": 12,
  "piu-europa": 2,
};

function right(shares: Record<string, number>) {
  const sum = Object.values(shares).reduce((a, b) => a + b, 0) || 1;
  return ((shares.lega ?? 0) + (shares["fratelli-ditalia"] ?? 0) + (shares["futuro-nazionale"] ?? 0)) / sum;
}

function fraction(shares: Record<string, number>, id: string) {
  const sum = Object.values(shares).reduce((a, b) => a + b, 0) || 1;
  return (shares[id] ?? 0) / sum;
}

describe("scenari", () => {
  it("la crisi immigrazione sposta voti verso le liste di destra e toglie al PD", () => {
    const applied = applyScenarioStack(baseline, lists, [
      {
        id: "crisi-immigrazione",
        title: "Crisi immigrazione",
        intensity: 1,
        duration: "media",
        scope: "nazionale",
        themes: { migration: 1 },
      },
    ]);
    assert.ok(right(applied.shares) > right(baseline));
    assert.ok(fraction(applied.shares, "partito-democratico") < fraction(baseline, "partito-democratico"));
    assert.ok(applied.notes.some((note) => note.includes("17,35%")));
  });

  it("uno scandalo sulla lista indicata la riduce", () => {
    const applied = applyScenarioStack(baseline, lists, [
      {
        id: "scandalo",
        title: "Scandalo",
        intensity: 1,
        duration: "media",
        scope: "nazionale",
        themes: { corruption: 1 },
        affectedPartyIds: ["partito-democratico"],
      },
    ]);
    assert.ok(fraction(applied.shares, "partito-democratico") < fraction(baseline, "partito-democratico"));
  });

  it("intensità zero non sposta le quote", () => {
    const applied = applyScenarioStack(baseline, lists, [
      { ...SCENARIO_PRESETS[0]!, intensity: 0 },
    ]);
    for (const id of Object.keys(baseline)) {
      assert.ok(Math.abs((applied.shares[id] ?? 0) - baseline[id]) < 1e-6);
    }
  });

  it("gli scenari impilati restano dentro i tetti e sommano a 100", () => {
    const applied = applyScenarioStack(
      baseline,
      lists,
      SCENARIO_PRESETS.map((preset) => ({ ...preset, intensity: 1 })),
    );
    const sum = Object.values(applied.shares).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(sum - 100) < 0.05);
    for (const share of Object.values(applied.shares)) {
      assert.ok(share >= 0 && share <= 100);
    }
    for (const row of applied.movements) {
      assert.ok(Math.abs(row.delta) <= SCENARIO_STACK_CAP + 12);
    }
  });

  it("un evento comunale pesa meno di uno nazionale sulla simulazione nazionale", () => {
    const full = applyScenarioStack(baseline, lists, [
      { ...SCENARIO_PRESETS[0]!, intensity: 1, scope: "nazionale" },
    ]);
    const local = applyScenarioStack(
      baseline,
      lists,
      [{ ...SCENARIO_PRESETS[0]!, intensity: 1, scope: "comunale", territory: "Roma" }],
      "nazionali",
    );
    const fullShift = Math.abs(right(full.shares) - right(baseline));
    const localShift = Math.abs(right(local.shares) - right(baseline));
    assert.ok(localShift < fullShift);
  });
});

describe("figure pubbliche", () => {
  it("riconosce Mussolini, cita la XII disposizione e la legge Scelba e tiene basso l'effetto", () => {
    const leader = assessLeader("Mussolini", "lista-nuova", 0.95);
    assert.equal(leader.matched, true);
    assert.equal(leader.deceased, true);
    assert.ok(leader.coherence > 70);
    assert.ok(leader.compatibility < 20);
    assert.ok((leader.cap ?? 100) < 2);
    assert.match(leader.legalNote ?? "", /XII/);
    assert.match(leader.legalNote ?? "", /Scelba/);
    assert.match(leader.legalNote ?? "", /645/);
    assert.doesNotMatch(leader.explanation, /duce/i);
  });

  it("Trump con il PD è poco coerente, Meloni con FdI è coerente", () => {
    const trump = assessLeader("Donald Trump", "partito-democratico", -0.35);
    const meloni = assessLeader("Giorgia Meloni", "fratelli-ditalia", 0.72);
    assert.ok(trump.matched);
    assert.ok(trump.coherence < 45);
    assert.ok(trump.swing < 0);
    assert.ok(meloni.coherence >= 80);
    assert.ok(meloni.notoriety >= 55);
  });
});
