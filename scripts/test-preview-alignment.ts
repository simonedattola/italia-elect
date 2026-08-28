/**
 * Verifica allineamento anteprima ↔ simulazione (stesso profilo e % simili).
 */
import { buildSimulationPreview } from "../src/lib/simulation/buildSimulationPreview";
import { resolveCandidateForSimulation } from "../src/lib/simulation/resolveCandidate";
import { runSimulation } from "../src/lib/simulation/engine";
import { DEFAULT_UI_SCENARIO } from "../src/types/scenario";

async function main() {
  const input = {
    firstName: "Roberto",
    lastName: "Vannacci",
    partySlug: "futuro-nazionale",
    description:
      "Generale ed europarlamentatore, presidente di Futuro Nazionale, posizioni sovraniste.",
  };

  const resolved = await resolveCandidateForSimulation(input);
  const engineInput = {
    candidate: {
      firstName: input.firstName,
      lastName: input.lastName,
      partySlug: input.partySlug,
      description: input.description,
    },
    scenario: DEFAULT_UI_SCENARIO,
    recognition: resolved.recognitionForEngine,
    publicFigure: resolved.publicFigureForEngine,
  };

  const preview = buildSimulationPreview(engineInput);
  const full = runSimulation({
    ...engineInput,
    seed: 999001,
    runs: 3000,
  });

  const fullLeader = full.nationalResults.find((r) => r.partySlug === input.partySlug)!;

  console.log("Preview compat:", preview.partyCompatibility);
  console.log("Full compat:", full.profile.partyCompatibility);
  console.log("Preview FN%:", preview.projectedLeaderPct);
  console.log("Full FN%:", fullLeader.percentage);

  const compatOk = preview.partyCompatibility === full.profile.partyCompatibility;
  const pctOk =
    Math.abs(preview.projectedLeaderPct - fullLeader.percentage) < 1.5;

  if (!compatOk) {
    throw new Error(
      `Compat mismatch preview ${preview.partyCompatibility} vs full ${full.profile.partyCompatibility}`,
    );
  }
  if (!pctOk) {
    throw new Error(
      `Pct mismatch preview ${preview.projectedLeaderPct} vs full ${fullLeader.percentage}`,
    );
  }

  console.log("✓ Preview aligned with simulation engine");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
