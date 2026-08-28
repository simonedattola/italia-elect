import type { PartyDefinition } from "@/types/simulation";

/** Partiti emergenti monitorati dal party-scanner (AI + sondaggi) */
export interface PartyWatchEntry extends PartyDefinition {
  detectKeywords: string[];
  pollAliases: string[];
  /** Soglia minima % in sondaggi per auto-promozione */
  minPollShare?: number;
}

export const PARTY_WATCHLIST: PartyWatchEntry[] = [
  {
    slug: "futuro-nazionale",
    name: "Futuro Nazionale",
    shortName: "FN",
    color: "#1A5276",
    ideology: "RIGHT",
    ideologyScore: 0.75,
    coalitionFamily: "DESTRA",
    foundedYear: 2025,
    aiDetected: true,
    detectKeywords: [
      "futuro nazionale",
      "vannacci futuro",
      "futuro nazionale con roberto vannacci",
      "movimento futuro nazionale",
    ],
    pollAliases: [
      "futuro-nazionale",
      "futuro nazionale",
      "futuronazionale",
      "fn",
    ],
    minPollShare: 0.5,
  },
  {
    slug: "noi-moderati",
    name: "Noi Moderati",
    shortName: "NM",
    color: "#1E90FF",
    ideology: "CENTER_RIGHT",
    ideologyScore: 0.25,
    coalitionFamily: "CENTRODESTRA",
    foundedYear: 2022,
    aiDetected: true,
    detectKeywords: ["noi moderati", "lupi moderati"],
    pollAliases: ["noi-moderati", "noi moderati"],
    minPollShare: 1.0,
  },
];
