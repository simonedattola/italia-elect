import { runSimulation } from "../src/lib/simulation/engine";
import { recognizeCandidate } from "../src/lib/intelligence/candidateRecognition";

const cases = [
  {
    name: "Meloni / FdI",
    candidate: {
      firstName: "Giorgia",
      lastName: "Meloni",
      partySlug: "fratelli-ditalia",
      description:
        "Presidente del Consiglio, leader di Fratelli d'Italia, posizione conservatrice e sovranista.",
      program: "Sicurezza, sostegno alle famiglie, politica industriale e sovranità nazionale.",
    },
  },
  {
    name: "Liberale incompatibile in FdI",
    candidate: {
      firstName: "Marco",
      lastName: "Rossi",
      partySlug: "fratelli-ditalia",
      description:
        "Imprenditore liberale europeista, favorevole a mercato aperto, diritti civili e accoglienza.",
      program: "Più Europa, liberalizzazioni e politiche LGBT inclusive.",
    },
  },
  {
    name: "Mario Roggero (sconosciuto, no omonimo Draghi)",
    candidate: {
      firstName: "Mario",
      lastName: "Roggero",
      partySlug: "partito-democratico",
      description:
        "Insegnante di storia con esperienza sindacale e impegno sul welfare e diritti dei lavoratori.",
      program: "Scuola pubblica, salari, sanità territoriale.",
    },
  },
  {
    name: "Bossetti (controverso)",
    candidate: {
      firstName: "Massimo",
      lastName: "Bossetti",
      partySlug: "lega",
      description:
        "Figura nota al pubblico italiano esclusivamente per vicende giudiziarie ampiamente riportate dalla stampa.",
    },
  },
  {
    name: "Draghi su Az/IV (candidato forte / partito minore)",
    candidate: {
      firstName: "Mario",
      lastName: "Draghi",
      partySlug: "azione-iv",
      description:
        "Ex Presidente del Consiglio e della BCE, profilo tecnico di alta credibilità istituzionale.",
      program: "Riforme, stabilità, integrazione europea.",
    },
  },
];

for (const c of cases) {
  const rec = recognizeCandidate(
    c.candidate.firstName,
    c.candidate.lastName,
    c.candidate.partySlug
  );
  const out = runSimulation({ candidate: c.candidate, seed: 42, runs: 2000 });
  const leader = out.nationalResults.find((r) => r.partySlug === c.candidate.partySlug)!;
  console.log("\n===", c.name, "===");
  console.log("Riconoscimento:", rec.category, "| rejected:", rec.aliasesRejected[0] ?? "—");
  console.log(
    "Quota:",
    leader.percentage,
    `IC ${out.confidenceLow}-${out.confidenceHigh}`,
    `| best/worst ${out.scenarios.leaderBest}/${out.scenarios.leaderWorst}`
  );
  console.log("Win P:", out.winProbability, "| regime:", out.context.weights.regime);
  console.log(
    "Influenze:",
    out.influenceFactors.map((f) => `${f.id}:${f.effectPts > 0 ? "+" : ""}${f.effectPts}`).join(" ")
  );
}

console.log("\n✓ Engine v2 smoke test OK");
