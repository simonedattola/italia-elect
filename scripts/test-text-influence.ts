/**
 * Verifica che descrizione/programma cambiano il risultato simulato.
 */
import { buildSimulationPreview } from "../src/lib/simulation/buildSimulationPreview";
import { resolveCandidateForSimulation } from "../src/lib/simulation/resolveCandidate";
import { DEFAULT_UI_SCENARIO } from "../src/types/scenario";

async function main() {
  const base = {
    firstName: "Mario",
    lastName: "Rossi",
    partySlug: "partito-democratico",
    description:
      "Candidato moderato del centrosinistra, europeista, attento ai temi sociali e del lavoro.",
  };

  const resolved = await resolveCandidateForSimulation(base);
  const engineBase = {
    candidate: base,
    scenario: DEFAULT_UI_SCENARIO,
    recognition: resolved.recognitionForEngine,
    publicFigure: resolved.publicFigureForEngine,
  };

  const aligned = buildSimulationPreview({
    ...engineBase,
    candidate: {
      ...base,
      description:
        "Leader progressista, sinistra, welfare, accoglienza, antifascista, riforme sociali per i lavoratori.",
      program:
        "Programma: riforma fiscale progressiva, investimenti in sanità e scuola, diritti civili, Europa.",
    },
  });

  const opposed = buildSimulationPreview({
    ...engineBase,
    candidate: {
      ...base,
      description:
        "Sovranista di destra, conservatore, flat tax, sicurezza e ordine, critico all'immigrazione.",
      program:
        "Programma: chiusura porti, patriottismo, tradizione familiare, riduzione tasse per imprese.",
    },
  });

  console.log("PD-aligned compat:", aligned.partyCompatibility, "pct:", aligned.projectedLeaderPct);
  console.log("PD-opposed compat:", opposed.partyCompatibility, "pct:", opposed.projectedLeaderPct);

  const compatDiff = aligned.partyCompatibility - opposed.partyCompatibility;
  const pctDiff = aligned.projectedLeaderPct - opposed.projectedLeaderPct;

  if (compatDiff < 15) {
    throw new Error(`Compat diff too small: ${compatDiff}`);
  }
  if (Math.abs(pctDiff) < 1.2) {
    throw new Error(`Pct diff too small: ${pctDiff}`);
  }

  console.log("✓ Testo candidato influenza compat e risultato");

  // Leader naturale: testo coerente vs opposto deve muovere la quota
  const vannacciResolved = await resolveCandidateForSimulation({
    firstName: "Roberto",
    lastName: "Vannacci",
    partySlug: "futuro-nazionale",
    description: "Politico italiano.",
  });
  const vAligned = buildSimulationPreview({
    candidate: {
      firstName: "Roberto",
      lastName: "Vannacci",
      partySlug: "futuro-nazionale",
      description:
        "Presidente Futuro Nazionale sovranista nazionalista euroscettico patriottico.",
    },
    scenario: DEFAULT_UI_SCENARIO,
    recognition: vannacciResolved.recognitionForEngine,
    publicFigure: vannacciResolved.publicFigureForEngine,
  });
  const vOpposed = buildSimulationPreview({
    candidate: {
      firstName: "Roberto",
      lastName: "Vannacci",
      partySlug: "futuro-nazionale",
      description:
        "Progressista sinistra welfare antifascista europeista accoglienza lavoratori sindacali.",
    },
    scenario: DEFAULT_UI_SCENARIO,
    recognition: vannacciResolved.recognitionForEngine,
    publicFigure: vannacciResolved.publicFigureForEngine,
  });
  const vPctDiff = vAligned.projectedLeaderPct - vOpposed.projectedLeaderPct;
  console.log(
    "Vannacci FN aligned pct:",
    vAligned.projectedLeaderPct,
    "opposed:",
    vOpposed.projectedLeaderPct,
    "diff:",
    vPctDiff,
  );
  if (vPctDiff < 0.8) {
    throw new Error(`Vannacci FN text pct diff too small: ${vPctDiff}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
