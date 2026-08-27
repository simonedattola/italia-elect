/**
 * Analisi “da bar” — tono ironico ma ancorato ai numeri del modello.
 */

import type { CandidateInput, SimulationOutput } from "@/types/simulation";
import { getParty } from "@/lib/electoral/parties";
import type { UiScenarioConfig } from "@/types/scenario";

export function buildFunAnalysis(
  input: CandidateInput,
  output: SimulationOutput & { profile?: { partyCompatibility?: number } },
  uiScenario?: Partial<UiScenarioConfig> | null,
): string {
  const party = getParty(input.partySlug);
  const leader = output.nationalResults.find(
    (r) => r.partySlug === input.partySlug,
  );
  const top = output.nationalResults[0];
  const name = `${input.firstName} ${input.lastName}`;
  const pct = leader?.percentage ?? 0;
  const win = output.winProbability;
  const chaos = uiScenario?.chaosMode || uiScenario?.uiMode === "fun";
  const compat = output.profile?.partyCompatibility;

  const lines: string[] = [];

  if (compat != null && compat < 25) {
    lines.push(
      `Ok, mettiamo ${name} a guidare ${party?.shortName ?? "quel partito"}. ` +
        `Il modello risponde: “carino l’esperimento, ma l’elettorato ha chiuso la porta”. ` +
        `Quota stimata intorno al ${pct}% — meno un’onda, più un’eco nel corridoio.`,
    );
  } else if (top?.partySlug === input.partySlug) {
    lines.push(
      `${name} arriva primo al ${pct}% (${win}% probabilità di restare in vetta). ` +
        `Se fosse una partita di calcetto, avrebbe già chiesto il cambio maglia al bar.`,
    );
  } else {
    lines.push(
      `${name} chiude al ${pct}%, dietro ${top?.shortName ?? "qualcun altro"}. ` +
        `Non è un flop da film, ma nemmeno il tour trionfale: probabilità vittoria ${win}%.`,
    );
  }

  if (chaos) {
    lines.push(
      `Modalità Amici/Chaos attiva: abbiamo alzato la volatilità. ` +
        `Traduzione: i numeri ballano di più — divertente, meno “da analista serio”.`,
    );
  }

  const adj = uiScenario?.partyVoteAdjustments ?? {};
  const adjEntries = Object.entries(adj).filter(([, v]) => v !== 0);
  if (adjEntries.length) {
    const bits = adjEntries
      .slice(0, 3)
      .map(([slug, v]) => {
        const p = getParty(slug);
        return `${p?.shortName ?? slug} ${v > 0 ? "+" : ""}${v}`;
      })
      .join(", ");
    lines.push(`Hai messo le mani sugli slider (${bits} pp). Il prior ha preso nota.`);
  }

  const provWins = output.provincialMap.filter(
    (p) => p.winnerSlug === input.partySlug,
  ).length;
  lines.push(
    `In mappa: circa ${provWins} province colorate del suo partito. ` +
      `Il Rosatellum poi decide se quei colori diventano poltrone o solo belle cartoline.`,
  );

  lines.push(
    `Disclaimer da bancone: è una simulazione statistica, non la schedina del lotto.`,
  );

  return lines.join("\n\n");
}
