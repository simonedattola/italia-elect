import type { PartyDefinition } from "@/types/simulation";

/** Partiti rilevanti nel sistema italiano contemporaneo (baseline post-2022) */
export const PARTIES: PartyDefinition[] = [
  {
    slug: "fratelli-ditalia",
    name: "Fratelli d'Italia",
    shortName: "FdI",
    color: "#003399",
    ideology: "RIGHT",
    ideologyScore: 0.72,
    coalitionFamily: "CENTRODESTRA",
    foundedYear: 2012,
  },
  {
    slug: "lega",
    name: "Lega",
    shortName: "Lega",
    color: "#00A651",
    ideology: "RIGHT",
    ideologyScore: 0.65,
    coalitionFamily: "CENTRODESTRA",
    foundedYear: 1989,
  },
  {
    slug: "forza-italia",
    name: "Forza Italia",
    shortName: "FI",
    color: "#0087DC",
    ideology: "CENTER_RIGHT",
    ideologyScore: 0.35,
    coalitionFamily: "CENTRODESTRA",
    foundedYear: 1994,
  },
  {
    slug: "partito-democratico",
    name: "Partito Democratico",
    shortName: "PD",
    color: "#E31C2B",
    ideology: "CENTER_LEFT",
    ideologyScore: -0.35,
    coalitionFamily: "CENTROSINISTRA",
    foundedYear: 2007,
  },
  {
    slug: "movimento-5-stelle",
    name: "Movimento 5 Stelle",
    shortName: "M5S",
    color: "#FFED00",
    ideology: "CENTER",
    ideologyScore: -0.1,
    coalitionFamily: "ALTRO",
    foundedYear: 2009,
  },
  {
    slug: "azione-iv",
    name: "Azione / Italia Viva",
    shortName: "Az/IV",
    color: "#E85D04",
    ideology: "CENTER",
    ideologyScore: 0.05,
    coalitionFamily: "CENTRO",
    foundedYear: 2019,
  },
  {
    slug: "avss",
    name: "Alleanza Verdi e Sinistra",
    shortName: "AVS",
    color: "#6BBE45",
    ideology: "LEFT",
    ideologyScore: -0.7,
    coalitionFamily: "SINISTRA",
    foundedYear: 2022,
  },
  {
    slug: "piu-europa",
    name: "+Europa",
    shortName: "+Eu",
    color: "#FFD700",
    ideology: "CENTER",
    ideologyScore: 0.0,
    coalitionFamily: "CENTRO",
    foundedYear: 2017,
  },
  {
    slug: "italexit",
    name: "Italexit / Destini altri",
    shortName: "Altri",
    color: "#6B7280",
    ideology: "FAR_RIGHT",
    ideologyScore: 0.85,
    coalitionFamily: "DESTRA",
    foundedYear: 2020,
  },
];

export function getParty(slug: string): PartyDefinition | undefined {
  return PARTIES.find((p) => p.slug === slug);
}

export function getPartyOrThrow(slug: string): PartyDefinition {
  const p = getParty(slug);
  if (!p) throw new Error(`Partito sconosciuto: ${slug}`);
  return p;
}

export const COALITION_LABELS: Record<string, string> = {
  CENTRODESTRA: "Centrodestra",
  CENTROSINISTRA: "Centrosinistra",
  CENTRO: "Centro",
  SINISTRA: "Sinistra",
  DESTRA: "Destra",
  ALTRO: "Altri",
};
