/**
 * Verifica metriche del master prompt — npm run verify:master
 */
import { buildPollingBaseline } from "../src/lib/electoral/dynamicBaseline";
import { computeCompositeBaseline } from "../src/lib/data/realtime/BaselineComposita";
import {
  computeAgentCandidateCompatibility,
  type CompatibilityAgent,
} from "../src/lib/compatibility/compatibilityEngine";
import { generateAgentSample, AgentScaler, VIRTUAL_POPULATION } from "../src/lib/agents";
import { meloniFollowerImpact } from "../src/lib/social/impactCalculator";
import { getParty } from "../src/lib/electoral/parties";
import { recognizeCandidateAsync } from "../src/lib/intelligence/candidateRecognition";
import { buildIntelligenceProfile } from "../src/lib/intelligence/candidateProfile";

const checks: Array<{ name: string; ok: boolean; detail: string }> = [];

function check(name: string, ok: boolean, detail: string) {
  checks.push({ name, ok, detail });
  console.log(ok ? "✓" : "✗", name, "—", detail);
}

async function main() {
  console.log("\n=== Italia Elect — Master Metrics ===\n");

  const baseline = buildPollingBaseline();
  const composite = computeCompositeBaseline();
  const lega = baseline.shares.lega ?? 0;
  const fn = baseline.shares["futuro-nazionale"] ?? 0;
  const pollFn = composite.pollCorrection["futuro-nazionale"] ?? 0;

  check(
    "Lega baseline ~5.2%",
    lega >= 4.8 && lega <= 5.5,
    `${lega.toFixed(2)}% (target 5.2%)`,
  );
  check(
    "FN rilevato ~8%",
    fn >= 7.4 && fn <= 8.5,
    `${fn.toFixed(2)}% operativo, sondaggi ${pollFn.toFixed(2)}%`,
  );
  check(
    "FN in core parties",
    Boolean(getParty("futuro-nazionale")),
    getParty("futuro-nazionale")?.name ?? "missing",
  );

  const mussolini = computeAgentCandidateCompatibility(baseAgent(), {
    firstName: "Benito",
    lastName: "Mussolini",
    partySlug: "lega",
  });
  check(
    "Mussolini/Lega ~0.5",
    mussolini.score >= 0.45 && mussolini.score <= 0.55,
    mussolini.score.toFixed(2),
  );

  const meloni = computeAgentCandidateCompatibility(baseAgent(), {
    firstName: "Giorgia",
    lastName: "Meloni",
    partySlug: "fratelli-ditalia",
  });
  check("Meloni/FdI >= 0.85", meloni.score >= 0.85, meloni.score.toFixed(2));

  const sample = generateAgentSample(5000);
  const scaled = AgentScaler.scale(sample);
  check(
    "60M virtuali scalati",
    scaled.virtualPopulation === VIRTUAL_POPULATION,
    `${scaled.sampleSize} × ${scaled.scalingFactor} = ${scaled.virtualPopulation}`,
  );

  const youngMeloni = sample.find((a) => a.age === 22 && a.socialProfile.followsMeloni);
  const youngNeutral = sample.find((a) => a.age === 22 && !a.socialProfile.followsMeloni);
  if (youngMeloni && youngNeutral) {
    const f = meloniFollowerImpact(youngMeloni);
    const n = meloniFollowerImpact(youngNeutral);
    check("Social Meloni 22enne", f > 0.7, `follower ${f.toFixed(2)}`);
    check("Social neutro 22enne", n < 0.25, `non-follower ${n.toFixed(2)}`);
  }

  const rec = await recognizeCandidateAsync(
    "Roberto",
    "Vannacci",
    "futuro-nazionale",
    { description: "Politico italiano." },
  );
  const profile = buildIntelligenceProfile(
    {
      firstName: "Roberto",
      lastName: "Vannacci",
      partySlug: "futuro-nazionale",
      description: "Politico italiano.",
    },
    rec,
    rec.publicFigure,
  );
  check(
    "Vannacci = FN",
    rec.publicFigure?.defaultPartySlug === "futuro-nazionale",
    `compat ${profile.partyCompatibility}%`,
  );
  check(
    "Vannacci/FN alta",
    profile.partyCompatibility >= 85,
    `${profile.partyCompatibility}%`,
  );

  const failed = checks.filter((c) => !c.ok);
  console.log(`\n${checks.length - failed.length}/${checks.length} passed\n`);
  if (failed.length) {
    process.exit(1);
  }
}

function baseAgent(): CompatibilityAgent {
  return {
    age: 45,
    education: "media",
    zone: "urbano",
    votingHistory: {
      politiche2018: "lega",
      politiche2022: "lega",
      europee2024: "lega",
      regionali2023: "lega",
      comunali2024: "lega",
    },
    weights: {
      personal: 0.06,
      politics: 0.1,
      economy: 0.3,
      security: 0.15,
      health: 0.1,
      education: 0.05,
      environment: 0.05,
      geopolitics: 0.05,
      taxes: 0.05,
      weather: 0.02,
      sports: 0.02,
      social: 0.05,
      news: 0.05,
    },
  };
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
