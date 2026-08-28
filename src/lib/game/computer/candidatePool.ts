/**
 * Pool candidati italiani per computer opponent.
 */
import type { GameCandidateInput, GamePartyChoice } from "../types";
import { CORE_PARTIES } from "@/lib/electoral/coreParties";

export interface PoolEntry {
  candidate: GameCandidateInput;
  partySlug: string;
  popularity: number;
  ideology: number;
  description: string;
}

export const ITALIAN_CANDIDATE_POOL: PoolEntry[] = [
  { partySlug: "fratelli-ditalia", candidate: { firstName: "Giorgia", lastName: "Meloni" }, popularity: 0.88, ideology: 0.72, description: "Presidente del Consiglio, leader sovranista." },
  { partySlug: "lega", candidate: { firstName: "Matteo", lastName: "Salvini" }, popularity: 0.7, ideology: 0.65, description: "Leader della Lega, sovranista." },
  { partySlug: "forza-italia", candidate: { firstName: "Antonio", lastName: "Tajani" }, popularity: 0.6, ideology: 0.35, description: "Presidente FI, moderato." },
  { partySlug: "partito-democratico", candidate: { firstName: "Elly", lastName: "Schlein" }, popularity: 0.75, ideology: -0.35, description: "Segretaria PD, progressista." },
  { partySlug: "movimento-5-stelle", candidate: { firstName: "Giuseppe", lastName: "Conte" }, popularity: 0.72, ideology: -0.1, description: "Leader M5S, populista." },
  { partySlug: "azione-iv", candidate: { firstName: "Carlo", lastName: "Calenda" }, popularity: 0.55, ideology: 0.05, description: "Leader Azione, liberale." },
  { partySlug: "azione-iv", candidate: { firstName: "Matteo", lastName: "Renzi" }, popularity: 0.5, ideology: 0.08, description: "Leader IV, riformista." },
  { partySlug: "avss", candidate: { firstName: "Angelo", lastName: "Bonelli" }, popularity: 0.42, ideology: -0.7, description: "Leader ambientalista." },
  { partySlug: "futuro-nazionale", candidate: { firstName: "Roberto", lastName: "Vannacci" }, popularity: 0.74, ideology: 0.75, description: "Presidente Futuro Nazionale." },
  { partySlug: "lega", candidate: { firstName: "Giancarlo", lastName: "Giorgetti" }, popularity: 0.48, ideology: 0.55, description: "Ministro economia, leghista." },
  { partySlug: "fratelli-ditalia", candidate: { firstName: "Matteo", lastName: "Adinolfi" }, popularity: 0.38, ideology: 0.78, description: "Eurodeputato FdI." },
  { partySlug: "partito-democratico", candidate: { firstName: "Nicola", lastName: "Zingaretti" }, popularity: 0.52, ideology: -0.4, description: "Ex segretario PD." },
];

export const VP_POOL: PoolEntry[] = [
  { partySlug: "fratelli-ditalia", candidate: { firstName: "Ignazio", lastName: "La Russa" }, popularity: 0.55, ideology: 0.75, description: "Presidente Senato." },
  { partySlug: "partito-democratico", candidate: { firstName: "Paolo", lastName: "Gentiloni" }, popularity: 0.58, ideology: -0.2, description: "Ex premier, europeista." },
  { partySlug: "lega", candidate: { firstName: "Lorenzo", lastName: "Fontana" }, popularity: 0.45, ideology: 0.68, description: "Vicepremier leghista." },
  { partySlug: "movimento-5-stelle", candidate: { firstName: "Luigi", lastName: "Di Maio" }, popularity: 0.5, ideology: 0, description: "Ex leader M5S." },
];

export function partyFromSlug(slug: string): GamePartyChoice {
  const p = CORE_PARTIES.find((x) => x.slug === slug)!;
  return {
    slug: p.slug,
    name: p.name,
    color: p.color,
    ideologyScore: p.ideologyScore,
  };
}

export function getPoolByOrientation(orientation: string): PoolEntry[] {
  if (orientation === "right") return ITALIAN_CANDIDATE_POOL.filter((e) => e.ideology >= 0.35);
  if (orientation === "left") return ITALIAN_CANDIDATE_POOL.filter((e) => e.ideology <= -0.2);
  if (orientation === "center") return ITALIAN_CANDIDATE_POOL.filter((e) => Math.abs(e.ideology) < 0.35);
  if (orientation === "populist") return ITALIAN_CANDIDATE_POOL.filter((e) => e.partySlug === "movimento-5-stelle" || e.popularity > 0.65);
  return ITALIAN_CANDIDATE_POOL;
}
