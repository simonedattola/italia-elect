/**
 * Testo campagna progressista/eurofila — deve allinearsi al PD, non alla Lega.
 */
import { buildIntelligenceProfile } from "../src/lib/intelligence/candidateProfile";
import { resolveCandidateForSimulation } from "../src/lib/simulation/resolveCandidate";
import { inferTextIdeology } from "../src/lib/intelligence/candidateTextSignals";

const CAMPAIGN_TEXT = `Una nuova Italia, un nuovo futuro

La nostra campagna nasce da una convinzione semplice: l'Italia può essere più forte, più giusta e più moderna.

Vogliamo costruire un Paese che investa davvero nei giovani, nella scuola e nella ricerca; che difenda i diritti e le libertà individuali; che sostenga chi lavora e chi vuole creare nuove opportunità; che affronti il cambiamento climatico con innovazione e responsabilità.

Vogliamo un'Italia protagonista in Europa, fedele ai valori democratici e capace di avere una voce autorebile nel mondo. Un'Italia che non abbia paura del cambiamento, ma lo governi mettendo la tecnologia e l'innovazione al servizio delle persone.

Questa è una campagna per una nuova generazione: più Europa, più opportunità, più diritti, più innovazione.

Per un'Italia democratica, europea e pronta al futuro.`;

async function main() {
  const ideology = inferTextIdeology(CAMPAIGN_TEXT.toLowerCase());
  console.log("Ideologia inferita dal testo:", ideology.toFixed(2));

  for (const [name, party] of [
    ["Mario Rossi", "partito-democratico"],
    ["Mario Rossi", "lega"],
    ["Matteo Salvini", "lega"],
    ["Matteo Salvini", "partito-democratico"],
  ] as const) {
    const [fn, ...rest] = name.split(" ");
    const ln = rest.join(" ");
    const resolved = await resolveCandidateForSimulation({
      firstName: fn,
      lastName: ln,
      partySlug: party,
      description: CAMPAIGN_TEXT,
    });
    const profile = buildIntelligenceProfile(
      { firstName: fn, lastName: ln, partySlug: party, description: CAMPAIGN_TEXT },
      resolved.recognitionForEngine,
      resolved.publicFigureForEngine,
    );
    const label = party === "partito-democratico" ? "PD" : "Lega";
    console.log(`${name} + ${label}: compat ${profile.partyCompatibility}%`);
  }

  const rossiPd = await profileCompat("Mario Rossi", "partito-democratico");
  const rossiLega = await profileCompat("Mario Rossi", "lega");
  if (rossiPd <= rossiLega) {
    throw new Error(`Rossi PD (${rossiPd}) should beat Lega (${rossiLega})`);
  }
  if (rossiPd < 55) {
    throw new Error(`Rossi PD compat too low: ${rossiPd}`);
  }
  if (rossiLega > 25) {
    throw new Error(`Rossi Lega compat too high: ${rossiLega}`);
  }

  const salviniLega = await profileCompat("Matteo Salvini", "lega");
  if (salviniLega > 45) {
    throw new Error(`Salvini+Lega with euro text should be low: ${salviniLega}`);
  }

  console.log("✓ Campagna progressista classificata correttamente");
}

async function profileCompat(name: string, party: string) {
  const [fn, ...rest] = name.split(" ");
  const ln = rest.join(" ");
  const resolved = await resolveCandidateForSimulation({
    firstName: fn,
    lastName: ln,
    partySlug: party,
    description: CAMPAIGN_TEXT,
  });
  const profile = buildIntelligenceProfile(
    { firstName: fn, lastName: ln, partySlug: party, description: CAMPAIGN_TEXT },
    resolved.recognitionForEngine,
    resolved.publicFigureForEngine,
  );
  return profile.partyCompatibility;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
