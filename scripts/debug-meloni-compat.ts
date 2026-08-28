import { buildIntelligenceProfile } from "../src/lib/intelligence/candidateProfile";
import { recognizeCandidateAsync } from "../src/lib/intelligence/candidateRecognition";
import { analyzeCandidateText } from "../src/lib/intelligence/candidateTextSignals";
import { computeElectoralCompatibility } from "../src/lib/intelligence/electoralCompatibility";
import { getParty } from "../src/lib/electoral/parties";

async function main() {
  const desc = "Presidente del Consiglio, leader di Fratelli d'Italia.";
  const rec = await recognizeCandidateAsync("Giorgia", "Meloni", "fratelli-ditalia", {
    description: desc,
  });
  const party = getParty("fratelli-ditalia")!;
  const signals = analyzeCandidateText(desc, party);
  const withFig = computeElectoralCompatibility({
    party,
    partySlug: "fratelli-ditalia",
    figure: rec.publicFigure,
    description: desc,
  });
  const noFig = computeElectoralCompatibility({
    party,
    partySlug: "fratelli-ditalia",
    description: desc,
    ideologyHint: signals.ideology,
  });
  const profile = buildIntelligenceProfile(
    { firstName: "Giorgia", lastName: "Meloni", partySlug: "fratelli-ditalia", description: desc },
    rec,
    rec.publicFigure,
  );
  console.log("depth", signals.depth, "ideology", signals.ideology, "gap", signals.ideologyGap);
  console.log("withFig", withFig.electoralCompatibilityScore, "inferred", withFig.inferredIdeology);
  console.log("noFig", noFig.electoralCompatibilityScore);
  console.log("profile compat", profile.partyCompatibility, "kb", profile.kbPartyCompatibility);
}

main();
