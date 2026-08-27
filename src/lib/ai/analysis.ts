import type { CandidateProfile, SimulationOutput } from "@/types/simulation";
import type { CandidateInput } from "@/types/simulation";
import { getPartyOrThrow } from "@/lib/electoral/parties";

/**
 * Genera analisi testuale motivata collegata ai dati del modello.
 * Se OPENAI_API_KEY è disponibile, può essere arricchita via AI SDK.
 */
export function buildDeterministicAnalysis(
  input: CandidateInput,
  output: SimulationOutput,
  profile: CandidateProfile
): string {
  const party = getPartyOrThrow(input.partySlug);
  const leader = output.nationalResults.find((r) => r.partySlug === party.slug)!;
  const top = output.nationalResults[0];
  const coalition = output.coalitions.find((c) => c.parties.includes(party.slug));

  const north = output.provincialMap.filter((p) =>
    ["Piemonte", "Lombardia", "Veneto", "Friuli-Venezia Giulia", "Liguria", "Emilia-Romagna", "Trentino-Alto Adige", "Valle d'Aosta"].includes(p.regionName)
  );
  const south = output.provincialMap.filter((p) =>
    ["Campania", "Puglia", "Calabria", "Basilicata", "Sicilia", "Sardegna", "Abruzzo", "Molise"].includes(p.regionName)
  );

  const northWins = north.filter((p) => p.winnerSlug === party.slug).length;
  const southWins = south.filter((p) => p.winnerSlug === party.slug).length;
  const totalProv = output.provincialMap.filter((p) => p.winnerSlug === party.slug).length;

  const lines: string[] = [];

  lines.push(
    `## Sintesi della simulazione\n`
  );
  lines.push(
    `Il modello stima per **${input.firstName} ${input.lastName}** (leader di ${party.name}) una quota nazionale del **${leader.percentage}%** (intervallo di confidenza 80%: ${output.confidenceLow}%–${output.confidenceHigh}%). ` +
      `La probabilità di vittoria (primo partito o maggioranza di coalizione alla Camera, proxy Monte Carlo) è del **${output.winProbability}%**.\n`
  );

  lines.push(`## Context Intelligence\n`);
  if (output.influenceFactors?.length) {
    for (const f of output.influenceFactors) {
      lines.push(
        `- **${f.label}**: ${f.effectPts > 0 ? "+" : ""}${f.effectPts} pt (peso ${(f.weight * 100).toFixed(0)}%) — ${f.detail}\n`
      );
    }
  }
  if (output.scenarios) {
    lines.push(
      `\nScenari Monte Carlo sul partito leader: medio **${output.scenarios.leaderMean}%**, migliore **${output.scenarios.leaderBest}%**, peggiore **${output.scenarios.leaderWorst}%**.\n`
    );
  }

  lines.push(`## Variabili principali\n`);
  lines.push(
    `- **Baseline storica**: prior derivato dalle ultime consultazioni incorporate (Ministero dell'Interno / Eligendo).\n` +
      `- **Moltiplicatore profilo**: notorietà ${profile.notoriety}/100, credibilità ${profile.credibility}/100, leadership ${profile.leadership}/100, mobilitazione ${profile.mobilization}/100.\n` +
      `- **Electoral Compatibility Score**: ${profile.partyCompatibility}/100 (separato dalla notorietà/Personal Impact) — ${
        profile.partyCompatibility >= 70
          ? "allineamento elevato, rischio fuga contenuto."
          : profile.partyCompatibility >= 25
            ? "allineamento basso/parziale: erosione del nucleo fedele."
            : profile.partyCompatibility < 5
              ? "rifiuto categorico o incompatibilità estrema: collasso del consenso storico."
              : "forte dissonanza ideologica: penalità moltiplicativa sulla fedeltà elettorale."
      }\n` +
      `- **Rischio scandali (inferenza)**: ${profile.scandalRisk}/100.\n` +
      `- **Qualità dati candidato**: ${profile.dataQuality}.\n`
  );

  lines.push(`## Geografia\n`);
  lines.push(
    `Su ${output.provincialMap.length} province, il partito risulta primo in **${totalProv}** (Nord ${northWins}/${north.length}, Mezzogiorno/Isole ${southWins}/${south.length}). `
  );
  if (northWins > southWins + 5) {
    lines.push(
      `Il vantaggio al Nord è coerente con i bias territoriali storici della famiglia ${coalition?.name ?? party.shortName} e con la compatibilità stimata sull'elettorato settentrionale.\n`
    );
  } else if (southWins > northWins + 5) {
    lines.push(
      `Il radicamento nel Mezzogiorno riflette i pattern storici del partito e la redistribuzione Monte Carlo sui bias meridionali.\n`
    );
  } else {
    lines.push(
      `La distribuzione geografica appare relativamente bilanciata rispetto alla baseline nazionale.\n`
    );
  }

  lines.push(`## Coalizioni e seggi\n`);
  if (coalition) {
    lines.push(
      `La coalizione **${coalition.name}** ottiene circa **${coalition.percentage.toFixed(1)}%**, ` +
        `**${coalition.seatsChamber}** seggi alla Camera (maggioranza ${coalition.hasMajorityChamber ? "raggiunta" : "non raggiunta"}) e ` +
        `**${coalition.seatsSenate}** al Senato.\n`
    );
  }

  if (top.partySlug !== party.slug) {
    lines.push(
      `Il primo partito stimato è **${top.shortName}** (${top.percentage}%). Il delta rispetto al candidato leader è di ${(top.percentage - leader.percentage).toFixed(1)} punti.\n`
    );
  } else {
    lines.push(
      `Il partito del candidato risulta **primo** nel voto nazionale stimato, con swing di ${leader.swing > 0 ? "+" : ""}${leader.swing} punti rispetto alla baseline.\n`
    );
  }

  lines.push(`## Note metodologiche e limiti\n`);
  for (const n of profile.evidenceNotes) {
    lines.push(`- ${n}\n`);
  }
  lines.push(
    `\n${output.modelMeta.disclaimer} ` +
      `Metodi: ${output.modelMeta.method.join(", ")}. Seed: ${output.modelMeta.seed}. Run Monte Carlo: ${output.modelMeta.monteCarloRuns}.`
  );

  return lines.join("");
}
