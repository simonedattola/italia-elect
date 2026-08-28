import { buildSimulationPreview } from "../src/lib/simulation/buildSimulationPreview";
import { resolveCandidateForSimulation } from "../src/lib/simulation/resolveCandidate";
import { DEFAULT_UI_SCENARIO } from "../src/types/scenario";

async function test(name: string, party: string, desc: string) {
  const [fn, ...rest] = name.split(" ");
  const ln = rest.join(" ") || fn;
  const resolved = await resolveCandidateForSimulation({
    firstName: fn,
    lastName: ln,
    partySlug: party,
    description: desc,
  });
  const p = buildSimulationPreview({
    candidate: { firstName: fn, lastName: ln, partySlug: party, description: desc },
    scenario: DEFAULT_UI_SCENARIO,
    recognition: resolved.recognitionForEngine,
    publicFigure: resolved.publicFigureForEngine,
  });
  console.log(
    `${name} | ${desc.slice(0, 45)} | compat ${p.partyCompatibility} | pct ${p.projectedLeaderPct}`,
  );
}

async function main() {
  await test(
    "Giorgia Meloni",
    "fratelli-ditalia",
    "Presidente del Consiglio, leader sovranista e patriottica.",
  );
  await test(
    "Giorgia Meloni",
    "fratelli-ditalia",
    "Progressista europeista antifascista sinistra welfare accoglienza.",
  );
  await test("Roberto Vannacci", "futuro-nazionale", "Politico italiano.");
  await test(
    "Roberto Vannacci",
    "futuro-nazionale",
    "Sovranista nazionalista euroscettico presidente Futuro Nazionale.",
  );
  await test(
    "Roberto Vannacci",
    "partito-democratico",
    "Sovranista nazionalista destra conservatore patriottico.",
  );

  console.log("\n--- Vannacci FN text variants ---");
  for (const desc of [
    "Politico italiano.",
    "Sovranista nazionalista euroscettico presidente Futuro Nazionale.",
    "Progressista sinistra welfare antifascista europeista accoglienza lavoratori.",
  ]) {
    await test("Roberto Vannacci", "futuro-nazionale", desc);
  }
}

main();
