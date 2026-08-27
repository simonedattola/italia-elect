/**
 * Event Impact Analysis — eventi politici/notizie → shock di voto.
 */

import type { EventAnalysis, EventImpact } from "@/types/intelligence";
import { clamp } from "@/lib/utils";

export interface RawEvent {
  id?: string;
  title: string;
  summary: string;
  occurredAt: string;
  sourceType: string;
  sourceUrl?: string;
  intensity: number;
  durationDays: number;
  favoredParties: string[];
  penalizedParties: string[];
  electorateShare: number;
  themes: string[];
}

export const EMBEDDED_EVENTS: RawEvent[] = [
  {
    id: "evt-budget-2026",
    title: "Discussione manovra di bilancio e costo della vita",
    summary:
      "Dibattito pubblico su misure fiscali e potere d'acquisto; copertura ampia su quotidiani nazionali.",
    occurredAt: "2026-07-01",
    sourceType: "quotidiano",
    sourceUrl: "https://www.ansa.it/",
    intensity: 0.55,
    durationDays: 60,
    favoredParties: ["partito-democratico", "movimento-5-stelle"],
    penalizedParties: ["fratelli-ditalia"],
    electorateShare: 0.45,
    themes: ["economia", "costo della vita", "fisco"],
  },
  {
    id: "evt-security-debate",
    title: "Dibattito su sicurezza e immigrazione",
    summary:
      "Ciclo di dichiarazioni istituzionali e copertura mediatica su ordine pubblico.",
    occurredAt: "2026-06-20",
    sourceType: "agenzia",
    intensity: 0.4,
    durationDays: 45,
    favoredParties: ["fratelli-ditalia", "lega"],
    penalizedParties: ["avss", "piu-europa"],
    electorateShare: 0.35,
    themes: ["sicurezza", "immigrazione"],
  },
  {
    id: "evt-eu-council",
    title: "Vertice UE e posizionamento italiano",
    summary:
      "Copertura su negoziati europei e ruolo del governo; impatto moderato su elettorato europeista.",
    occurredAt: "2026-06-10",
    sourceType: "istituzionale",
    sourceUrl: "https://www.governo.it/",
    intensity: 0.3,
    durationDays: 30,
    favoredParties: ["forza-italia", "azione-iv", "piu-europa"],
    penalizedParties: ["italexit"],
    electorateShare: 0.2,
    themes: ["europa", "politica estera"],
  },
  {
    id: "evt-opposition-unity",
    title: "Segnali di coordinamento nel centrosinistra",
    summary:
      "Articoli e dichiarazioni su possibili alleanze; effetto sul voto utile moderato.",
    occurredAt: "2026-07-08",
    sourceType: "quotidiano",
    intensity: 0.35,
    durationDays: 40,
    favoredParties: ["partito-democratico", "avss"],
    penalizedParties: [],
    electorateShare: 0.25,
    themes: ["coalizioni", "voto utile"],
  },
];

function decayStrength(occurredAt: string, durationDays: number, now = Date.now()): number {
  const age = (now - new Date(occurredAt).getTime()) / 86400000;
  if (age < 0) return 1;
  if (age > durationDays * 1.5) return 0;
  return clamp(Math.exp(-age / (durationDays * 0.45)), 0, 1);
}

export function analyzeEvents(
  events: RawEvent[] = EMBEDDED_EVENTS,
  now = Date.now()
): EventAnalysis {
  const impacts: EventImpact[] = [];
  const net: Record<string, number> = {};
  const themeCount: Record<string, number> = {};
  const sources: string[] = [];

  for (const e of events) {
    const rem = decayStrength(e.occurredAt, e.durationDays, now);
    if (rem < 0.05) continue;

    const pts = e.intensity * rem * e.electorateShare * 4; // fino ~2 pt tipici
    impacts.push({
      id: e.id ?? e.title,
      title: e.title,
      intensity: e.intensity,
      remainingStrength: rem,
      favoredParties: e.favoredParties,
      penalizedParties: e.penalizedParties,
      electorateShare: e.electorateShare,
      themes: e.themes,
    });

    for (const slug of e.favoredParties) {
      net[slug] = (net[slug] ?? 0) + pts / Math.max(e.favoredParties.length, 1);
    }
    for (const slug of e.penalizedParties) {
      net[slug] = (net[slug] ?? 0) - pts / Math.max(e.penalizedParties.length, 1);
    }
    for (const t of e.themes) {
      themeCount[t] = (themeCount[t] ?? 0) + e.intensity * rem;
    }
    if (e.sourceUrl) sources.push(e.sourceUrl);
    else sources.push(e.sourceType);
  }

  const dominantThemes = Object.entries(themeCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([t]) => t);

  return {
    events: impacts,
    netPartyShocks: net,
    dominantThemes,
    sources: [...new Set(sources)],
  };
}

export function detectRegimeFromEvents(
  events: EventAnalysis,
  economyIndex: number
): { crisisPolitical: boolean; crisisEconomic: boolean; international: boolean } {
  const themes = new Set(events.dominantThemes.map((t) => t.toLowerCase()));
  return {
    crisisEconomic:
      economyIndex < -0.15 ||
      themes.has("economia") ||
      themes.has("costo della vita"),
    crisisPolitical:
      themes.has("scandalo") ||
      themes.has("crisi di governo") ||
      events.events.some((e) => e.intensity > 0.7 && e.penalizedParties.length > 0),
    international:
      themes.has("europa") ||
      themes.has("politica estera") ||
      themes.has("guerra"),
  };
}
