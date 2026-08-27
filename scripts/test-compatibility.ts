/**
 * Suite estremi — Personal Impact ≠ Electoral Compatibility.
 */
import { identifyPublicFigure } from "../src/lib/intelligence/publicFigure/engine";
import { recognizeCandidateAsync } from "../src/lib/intelligence/candidateRecognition";
import { runSimulation } from "../src/lib/simulation/engine";
import { getCurrentBaseline } from "../src/lib/electoral/historical";
import { computeElectoralCompatibility } from "../src/lib/intelligence/electoralCompatibility";
import { getPartyOrThrow } from "../src/lib/electoral/parties";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log("✓", msg);
}

async function simCase(
  firstName: string,
  lastName: string,
  partySlug: string,
  description: string
) {
  const identified = await recognizeCandidateAsync(firstName, lastName, partySlug, {
    description,
  });
  const out = runSimulation({
    candidate: { firstName, lastName, partySlug, description },
    seed: 42,
    runs: 2500,
    recognition: identified,
    publicFigure: identified.publicFigure,
  });
  const leader = out.nationalResults.find((r) => r.partySlug === partySlug)!;
  const cand = out.influenceFactors.find((f) => f.id === "candidate");
  return { identified, out, leader, cand, fig: identified.publicFigure };
}

async function main() {
  console.log("\n=== Compatibilità non lineare — test estremi ===\n");
  const baseline = getCurrentBaseline();
  const pdBase = baseline["partito-democratico"] ?? 20;

  // --- Hitler + PD ---
  const hitler = await simCase(
    "Adolf",
    "Hitler",
    "partito-democratico",
    "Figura storica totalitaria, responsabile dell'Olocausto e della Seconda guerra mondiale."
  );
  console.log(
    "  Hitler/PD → compat",
    hitler.out.profile.partyCompatibility,
    "| %",
    hitler.leader.percentage,
    "| cand",
    hitler.cand?.effectPts,
    "| publicFigure",
    hitler.out.profile.isPublicFigure
  );
  assert(hitler.out.profile.isPublicFigure === true, "Hitler: publicFigure true");
  assert(
    hitler.out.profile.partyCompatibility < 10,
    `Hitler/PD compatibilità <10 (got ${hitler.out.profile.partyCompatibility})`
  );
  assert(
    (hitler.cand?.effectPts ?? 0) < -6,
    `Hitler/PD forte perdita elettori (effect ${hitler.cand?.effectPts})`
  );
  assert(
    hitler.leader.percentage < pdBase * 0.55,
    `Hitler/PD risultato molto sotto baseline (${hitler.leader.percentage} vs base ${pdBase})`
  );

  // --- Berlusconi + PD ---
  const berlusconi = await simCase(
    "Silvio",
    "Berlusconi",
    "partito-democratico",
    "Ex Presidente del Consiglio, fondatore di Forza Italia."
  );
  console.log(
    "  Berlusconi/PD → compat",
    berlusconi.out.profile.partyCompatibility,
    "| %",
    berlusconi.leader.percentage,
    "| cand",
    berlusconi.cand?.effectPts
  );
  assert(
    berlusconi.out.profile.partyCompatibility < 35,
    `Berlusconi/PD compatibilità bassa (${berlusconi.out.profile.partyCompatibility})`
  );
  assert(
    (berlusconi.cand?.effectPts ?? 0) < -3,
    `Berlusconi/PD perdita elettori identitari (${berlusconi.cand?.effectPts})`
  );

  // --- Meloni + PD ---
  const meloniPd = await simCase(
    "Giorgia",
    "Meloni",
    "partito-democratico",
    "Presidente del Consiglio, leader di Fratelli d'Italia."
  );
  console.log(
    "  Meloni/PD → compat",
    meloniPd.out.profile.partyCompatibility,
    "| %",
    meloniPd.leader.percentage,
    "| cand",
    meloniPd.cand?.effectPts
  );
  assert(
    meloniPd.out.profile.partyCompatibility < 40,
    `Meloni/PD compatibilità bassa/media (${meloniPd.out.profile.partyCompatibility})`
  );
  assert(
    (meloniPd.cand?.effectPts ?? 0) < -2,
    `Meloni/PD perdita base storica PD (${meloniPd.cand?.effectPts})`
  );

  // --- Schlein + PD (candidato storico del partito) ---
  const schlein = await simCase(
    "Elly",
    "Schlein",
    "partito-democratico",
    "Segretaria del Partito Democratico, profilo progressista."
  );
  console.log(
    "  Schlein/PD → compat",
    schlein.out.profile.partyCompatibility,
    "| %",
    schlein.leader.percentage,
    "| cand",
    schlein.cand?.effectPts
  );
  assert(
    schlein.out.profile.partyCompatibility >= 70,
    `Schlein/PD compatibilità alta (${schlein.out.profile.partyCompatibility})`
  );
  assert(
    (schlein.cand?.effectPts ?? 0) > 0,
    `Schlein/PD effetto positivo (${schlein.cand?.effectPts})`
  );

  // --- Separazione Personal Impact vs Compatibility ---
  const fig = await identifyPublicFigure("Adolf", "Hitler");
  const breakdown = computeElectoralCompatibility({
    party: getPartyOrThrow("partito-democratico"),
    partySlug: "partito-democratico",
    figure: fig,
    description: "Dittatore nazista.",
  });
  assert(breakdown.personalImpactScore >= 50, `Hitler Personal Impact alto (${breakdown.personalImpactScore})`);
  assert(
    breakdown.electoralCompatibilityScore < 10,
    `Hitler Electoral Compatibility <10 (${breakdown.electoralCompatibilityScore})`
  );
  assert(breakdown.categoricalRejection, "Hitler: rifiuto categorico");
  assert(
    breakdown.personalImpactScore > breakdown.electoralCompatibilityScore + 40,
    "Notorietà/impatto NON compensano la compatibilità"
  );

  // Meloni su FdI resta positiva
  const meloniFdi = await simCase(
    "Giorgia",
    "Meloni",
    "fratelli-ditalia",
    "Presidente del Consiglio, leader di Fratelli d'Italia."
  );
  assert(
    meloniFdi.out.profile.partyCompatibility >= 80,
    `Meloni/FdI compatibilità alta (${meloniFdi.out.profile.partyCompatibility})`
  );
  assert(
    (meloniFdi.cand?.effectPts ?? 0) > 2,
    `Meloni/FdI effetto positivo (${meloniFdi.cand?.effectPts})`
  );

  console.log("\n✓ Suite compatibilità estremi OK\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
