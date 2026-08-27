/**
 * Test obbligatori Entity Resolution / Public Figure Recognition.
 */
import { identifyPublicFigureSync } from "../src/lib/intelligence/publicFigure/engine";
import { identifyPublicFigure } from "../src/lib/intelligence/publicFigure/engine";
import { brandLabelIt, computePersonalBrand } from "../src/lib/intelligence/publicFigure/personalBrand";
import { runSimulation } from "../src/lib/simulation/engine";
import { recognizeCandidateAsync } from "../src/lib/intelligence/candidateRecognition";
import { CONFIDENCE_AUTO_THRESHOLD } from "../src/lib/intelligence/publicFigure/types";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log("✓", msg);
}

async function main() {
  console.log("\n=== Test riconoscimento (sync KB) ===\n");

  const berlusconi = identifyPublicFigureSync("Silvio", "Berlusconi");
  assert(berlusconi.publicFigure === true, "Berlusconi publicFigure=true");
  assert(berlusconi.roleCategory === "politician", "Berlusconi category=politician");
  assert(berlusconi.category === "NATIONAL_PUBLIC", "Berlusconi = figura pubblica nazionale");
  assert(!berlusconi.insufficientData, "Berlusconi: dati sufficienti");
  assert(
    berlusconi.notorietyScore >= 90,
    `Berlusconi notorietà >= 90 (${berlusconi.notorietyScore})`
  );
  assert(berlusconi.confidence >= CONFIDENCE_AUTO_THRESHOLD, "Berlusconi confidenza alta");
  const brand = computePersonalBrand(berlusconi);
  assert(
    brand.score >= 70,
    `Berlusconi Personal Brand alto/molto alto (${brand.score}, ${brandLabelIt(brand.label)})`
  );
  assert(
    berlusconi.biography.toLowerCase().includes("forza italia") ||
      berlusconi.associatedParties.some((p) => p.toLowerCase().includes("forza")),
    "Berlusconi: storia Forza Italia"
  );
  assert(
    berlusconi.positions.some((p) => p.toLowerCase().includes("consiglio")) ||
      berlusconi.politicalHistory.some((p) => p.toLowerCase().includes("consiglio")),
    "Berlusconi: ex Presidente del Consiglio"
  );

  const meloni = identifyPublicFigureSync("Giorgia", "Meloni");
  assert(meloni.publicFigure === true, "Meloni publicFigure=true");
  assert(meloni.roleCategory === "politician", "Meloni category=politician");
  assert(
    meloni.notorietyScore >= 90,
    `Meloni notorietà >= 90 (${meloni.notorietyScore})`
  );

  const rossi = identifyPublicFigureSync("Mario", "Rossi");
  assert(rossi.publicFigure === false, "Mario Rossi publicFigure=false");
  assert(rossi.category === "UNKNOWN", "Mario Rossi = non determinato");
  assert(rossi.insufficientData, "Mario Rossi: insufficient data");
  assert(
    rossi.message.includes("Non sono disponibili informazioni sufficienti"),
    "Mario Rossi: messaggio corretto"
  );
  const rossiBrand = computePersonalBrand(rossi);
  assert(rossiBrand.score <= 22, `Mario Rossi brand basso (${rossiBrand.score})`);

  const fake = identifyPublicFigureSync("Mario", "Berlusconi");
  assert(
    fake.category === "UNKNOWN" || fake.normalizedKey !== "silvio berlusconi",
    "Mario Berlusconi ≠ Silvio Berlusconi"
  );

  console.log("\n=== Test async Entity Resolution ===\n");
  const asyncB = await identifyPublicFigure("Silvio", "Berlusconi");
  assert(asyncB.publicFigure === true, "Async Berlusconi publicFigure=true");
  assert(asyncB.roleCategory === "politician", "Async Berlusconi politician");
  assert(asyncB.notorietyScore >= 90, `Async Berlusconi notoriety ${asyncB.notorietyScore}`);
  console.log(
    "  method:",
    asyncB.recognitionMethod,
    "| brand:",
    asyncB.personalBrandScore,
    "| confidence:",
    asyncB.confidence
  );

  const asyncM = await identifyPublicFigure("Giorgia", "Meloni");
  assert(asyncM.publicFigure === true, "Async Meloni publicFigure=true");
  assert(asyncM.roleCategory === "politician", "Async Meloni politician");
  assert(asyncM.notorietyScore >= 90, `Async Meloni notoriety ${asyncM.notorietyScore}`);

  const unknown = await identifyPublicFigure("Xyzzy", "Qwertyfoo", { skipRemote: true });
  assert(unknown.publicFigure === false, "Persona sconosciuta publicFigure=false");

  console.log("\n=== Mario Roggero (identità o bassa confidenza) ===\n");
  const roggero = await identifyPublicFigure("Mario", "Roggero", {
    description: "Candidato locale senza carriera politica nazionale nota.",
    partySlug: "partito-democratico",
  });
  console.log(
    "  found:",
    roggero.canonicalName || roggero.name,
    "| publicFigure:",
    roggero.publicFigure,
    "| confidence:",
    roggero.confidence,
    "| needsConfirmation:",
    roggero.needsConfirmation,
    "| role:",
    roggero.roleCategory,
    "| method:",
    roggero.recognitionMethod
  );
  assert(
    roggero.needsConfirmation ||
      roggero.confidence < CONFIDENCE_AUTO_THRESHOLD ||
      !roggero.publicFigure ||
      (roggero.wikidataId != null && roggero.confidence >= 0),
    "Roggero: identificato correttamente oppure bassa confidenza / non figura politica"
  );
  // Non deve essere trattato come politico nazionale ad alta notorietà
  assert(
    !(roggero.publicFigure && roggero.roleCategory === "politician" && roggero.notorietyScore >= 90),
    "Roggero non deve risultare politico nazionale top-tier"
  );

  console.log("\n=== Test simulazione Berlusconi-PD ===\n");
  const identified = await recognizeCandidateAsync(
    "Silvio",
    "Berlusconi",
    "partito-democratico"
  );
  const sim = runSimulation({
    candidate: {
      firstName: "Silvio",
      lastName: "Berlusconi",
      partySlug: "partito-democratico",
      description:
        "Ex Presidente del Consiglio, fondatore di Forza Italia, lunga esperienza politica nazionale.",
    },
    seed: 7,
    runs: 2500,
    recognition: identified,
    publicFigure: identified.publicFigure,
  });

  assert(sim.profile.isPublicFigure, "Simulazione: isPublicFigure=true");
  assert(sim.profile.notoriety >= 90, `Simulazione notorietà ${sim.profile.notoriety}`);
  assert(
    sim.profile.partyCompatibility < 60,
    `Berlusconi-PD: compatibilità bassa (${sim.profile.partyCompatibility})`
  );
  const candEff = sim.influenceFactors.find((f) => f.id === "candidate");
  console.log(
    "  PD%:",
    sim.nationalResults.find((r) => r.partySlug === "partito-democratico")?.percentage,
    "| cand effect:",
    candEff?.effectPts,
    "| winP:",
    sim.winProbability,
    "| compat:",
    sim.profile.partyCompatibility
  );

  console.log("\n=== Effetto limitato sconosciuto ===\n");
  const unkRec = await recognizeCandidateAsync("Mario", "Rossi", "partito-democratico", {
    skipRemote: true,
  });
  const simUnk = runSimulation({
    candidate: {
      firstName: "Mario",
      lastName: "Rossi",
      partySlug: "partito-democratico",
      description: "Candidato locale con esperienza amministrativa comunale limitata.",
    },
    seed: 11,
    runs: 1500,
    recognition: unkRec,
    publicFigure: unkRec.publicFigure,
  });
  assert(!simUnk.profile.isPublicFigure, "Rossi simulazione: non figura pubblica");
  const unkEff = simUnk.influenceFactors.find((f) => f.id === "candidate");
  assert(
    unkEff != null && Math.abs(unkEff.effectPts) <= 3.5,
    `Rossi effetto candidato limitato (${unkEff?.effectPts})`
  );

  console.log("\n✓ Tutti i test di riconoscimento OK\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
