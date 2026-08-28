/**
 * Verifica compatibilità Roberto Vannacci vs FN e Lega.
 * Vannacci = presidente e fondatore di Futuro Nazionale (feb 2026), ex Lega.
 */
import { recognizeCandidateAsync } from "../src/lib/intelligence/candidateRecognition";
import { buildIntelligenceProfile, candidateElectoralDelta } from "../src/lib/intelligence/candidateProfile";
import { computeElectoralCompatibility } from "../src/lib/intelligence/electoralCompatibility";
import { getParty } from "../src/lib/electoral/parties";

function expect(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
  console.log("✓", msg);
}

async function main() {
  console.log("\n=== Test Vannacci compatibilità ===\n");

  const rec = await recognizeCandidateAsync(
    "Roberto",
    "Vannacci",
    "futuro-nazionale",
    { description: "Politico italiano." },
  );
  const figure = rec.publicFigure;

  console.log("defaultPartySlug:", figure?.defaultPartySlug);
  console.log("ideologyHint:", figure?.ideologyHint);
  console.log("recognitionMethod:", figure?.recognitionMethod);

  const profile = buildIntelligenceProfile(
    {
      firstName: "Roberto",
      lastName: "Vannacci",
      partySlug: "futuro-nazionale",
      description: "Politico italiano.",
    },
    rec,
    figure,
  );

  const fn = getParty("futuro-nazionale")!;
  const lega = getParty("lega")!;

  const compatFn = computeElectoralCompatibility({
    party: fn,
    partySlug: "futuro-nazionale",
    figure,
    description: "Politico italiano.",
  });
  const compatLega = computeElectoralCompatibility({
    party: lega,
    partySlug: "lega",
    figure,
    description: "Politico italiano.",
  });

  console.log(`partyCompatibility (FN): ${profile.partyCompatibility}`);
  console.log(`FN electoral: ${compatFn.electoralCompatibilityScore}`);
  console.log(`Lega electoral: ${compatLega.electoralCompatibilityScore}`);

  expect(
    figure?.defaultPartySlug === "futuro-nazionale",
    "Vannacci default party = Futuro Nazionale",
  );
  expect(
    profile.partyCompatibility >= 85,
    `Vannacci/FN >= 85% (got ${profile.partyCompatibility})`,
  );
  expect(
    compatLega.electoralCompatibilityScore < 25,
    `Vannacci/Lega < 25% (got ${compatLega.electoralCompatibilityScore})`,
  );
  expect(
    profile.partyCompatibility > compatLega.electoralCompatibilityScore,
    "FN compat > Lega compat",
  );

  const delta = candidateElectoralDelta(profile, undefined, undefined, undefined, {
    naturalPartyLeader: figure?.defaultPartySlug === "futuro-nazionale",
  });
  expect(
    delta.expectedPts >= 0,
    `Vannacci/FN effetto candidato non negativo (got ${delta.expectedPts.toFixed(2)}pp)`,
  );

  console.log("\n=== OK ===\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
