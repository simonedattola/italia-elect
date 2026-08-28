import { resolveCandidateForSimulation } from "../src/lib/simulation/resolveCandidate";
import { buildSimulationPreview } from "../src/lib/simulation/buildSimulationPreview";
import { DEFAULT_UI_SCENARIO } from "../src/types/scenario";
import { buildIntelligenceProfile } from "../src/lib/intelligence/candidateProfile";
import { candidateElectoralDelta } from "../src/lib/intelligence/candidateProfile";
import { getPollOnlyShares } from "../src/lib/electoral/dynamicBaseline";

async function main() {
  const desc = "Politico italiano.";
  const resolved = await resolveCandidateForSimulation({
    firstName: "Roberto",
    lastName: "Vannacci",
    partySlug: "futuro-nazionale",
    description: desc,
  });

  const profile = buildIntelligenceProfile(
    {
      firstName: "Roberto",
      lastName: "Vannacci",
      partySlug: "futuro-nazionale",
      description: desc,
    },
    resolved.recognitionForEngine,
    resolved.publicFigureForEngine,
  );

  const delta = candidateElectoralDelta(profile, undefined, undefined, undefined, {
    naturalPartyLeader: resolved.publicFigureForEngine?.defaultPartySlug === "futuro-nazionale",
  });
  const polls = getPollOnlyShares();
  const preview = buildSimulationPreview({
    candidate: {
      firstName: "Roberto",
      lastName: "Vannacci",
      partySlug: "futuro-nazionale",
      description: desc,
    },
    scenario: DEFAULT_UI_SCENARIO,
    recognition: resolved.recognitionForEngine,
    publicFigure: resolved.publicFigureForEngine,
  });

  console.log("=== Vannacci + FN ===");
  console.log("KB defaultParty:", resolved.publicFigureForEngine.defaultPartySlug);
  console.log("Compatibilità:", profile.partyCompatibility);
  console.log("expectedPts (delta):", delta.expectedPts);
  console.log("multiplier:", delta.multiplier);
  console.log("attraction:", delta.attractionPts, "rejection:", delta.rejectionPts);
  console.log("Poll baseline FN:", polls["futuro-nazionale"]?.toFixed(2));
  console.log("Context baseline FN:", preview.contextBaselinePct?.toFixed(2));
  console.log("Projected FN%:", preview.projectedLeaderPct);
  console.log("Swing (vs poll storico):", preview.swing);
  console.log("expectedPts (preview):", preview.expectedPts);

  const richDesc =
    "Presidente e fondatore di Futuro Nazionale. Sovranista, nazionalista, euroscettico. Leader del movimento.";
  const resolved2 = await resolveCandidateForSimulation({
    firstName: "Roberto",
    lastName: "Vannacci",
    partySlug: "futuro-nazionale",
    description: richDesc,
  });
  const preview2 = buildSimulationPreview({
    candidate: {
      firstName: "Roberto",
      lastName: "Vannacci",
      partySlug: "futuro-nazionale",
      description: richDesc,
    },
    scenario: DEFAULT_UI_SCENARIO,
    recognition: resolved2.recognitionForEngine,
    publicFigure: resolved2.publicFigureForEngine,
  });
  console.log("\n=== Con descrizione ricca ===");
  console.log("Compat:", preview2.partyCompatibility);
  console.log("Projected FN%:", preview2.projectedLeaderPct);
  console.log("Swing:", preview2.swing);
}

main();
