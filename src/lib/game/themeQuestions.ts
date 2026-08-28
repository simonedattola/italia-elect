/**
 * Questionario temi per partito custom (max 8 domande attive).
 */
import type { ThemeQuestion } from "./types";

export const THEME_QUESTIONS: ThemeQuestion[] = [
  {
    id: "immigration",
    theme: "Immigrazione",
    label: "L'Italia dovrebbe ridurre drasticamente gli sbarchi?",
    type: "yesno",
  },
  {
    id: "europe",
    theme: "Europa",
    label: "Integrazione europea più profonda (anche fiscale)?",
    type: "scale",
    min: 1,
    max: 5,
    labels: ["Fortemente no", "Fortemente sì"],
  },
  {
    id: "economy",
    theme: "Economia",
    label: "Priorità principale dell'economia:",
    type: "choice",
    options: [
      "Taglio tasse e imprese",
      "Welfare e salari",
      "Investimenti green",
      "Stabilità e austerity",
    ],
  },
  {
    id: "environment",
    theme: "Ambiente",
    label: "Accelerare la transizione ecologica anche con costi elevati?",
    type: "yesno",
  },
  {
    id: "security",
    theme: "Sicurezza",
    label: "Più poteri a forze dell'ordine e pena detentiva?",
    type: "scale",
    min: 1,
    max: 5,
  },
  {
    id: "welfare",
    theme: "Welfare",
    label: "Reddito minimo universale garantito dallo Stato?",
    type: "yesno",
  },
  {
    id: "institutions",
    theme: "Istituzioni",
    label: "Riforma presidenzialista e meno parlamentarismo?",
    type: "choice",
    options: ["Sì, presidenzialismo", "No, mantieni sistema attuale", "Semi-presidenziale"],
  },
  {
    id: "taxes",
    theme: "Fisco",
    label: "Flat tax al 15% per tutti?",
    type: "yesno",
  },
];

export function ideologyFromCustomProfile(
  economic: number,
  social: number,
  answers: Record<string, string | number | boolean>,
): { ideologyScore: number; authScore: number } {
  let eco = economic;
  let auth = social;

  if (answers.immigration === true) eco += 0.15;
  if (answers.immigration === false) eco -= 0.1;
  if (answers.environment === true) eco -= 0.12;
  if (answers.welfare === true) eco -= 0.18;
  if (answers.taxes === true) eco += 0.2;
  if (answers.security && typeof answers.security === "number") {
    auth += (answers.security - 3) * 0.08;
  }
  if (answers.europe && typeof answers.europe === "number") {
    eco -= (answers.europe - 3) * 0.06;
  }
  if (answers.economy === "Taglio tasse e imprese") eco += 0.25;
  if (answers.economy === "Welfare e salari") eco -= 0.22;
  if (answers.economy === "Investimenti green") eco -= 0.15;
  if (answers.institutions === "Sì, presidenzialismo") auth += 0.2;

  return {
    ideologyScore: Math.max(-1, Math.min(1, eco)),
    authScore: Math.max(-1, Math.min(1, auth)),
  };
}

export function partyColorFromIdeology(score: number): string {
  if (score <= -0.5) return "#DC2626";
  if (score <= -0.15) return "#E11D48";
  if (score <= 0.15) return "#7C3AED";
  if (score <= 0.5) return "#2563EB";
  return "#1D4ED8";
}
