import type { ScenarioInput, ScenarioTheme } from "./types";
import { completeJson } from "@/lib/ai/gateway";

const THEMES: ScenarioTheme[] = [
  "migration",
  "recession",
  "inflation",
  "energy",
  "security",
  "corruption",
  "war",
  "pandemic",
  "growth",
  "environment",
  "leader",
];

const KEYWORDS: [RegExp, ScenarioTheme][] = [
  [/migr|sbarch|confin|accoglien/i, "migration"],
  [/recess|crisi economic|pil|disoccup/i, "recession"],
  [/inflaz|caro vita|prezzi|carovita/i, "inflation"],
  [/energi|gas|bollett|elettric/i, "energy"],
  [/sicurezz|terror|attentat|criminal/i, "security"],
  [/corru|mazzett|tangent/i, "corruption"],
  [/guerra|ucrain|internazional|nato\b/i, "war"],
  [/pandem|covid|epidem|virus/i, "pandemic"],
  [/crescita|ripresa|boom economic/i, "growth"],
  [/clima|alluvion|siccit|ambient|terremot/i, "environment"],
  [/scandalo del leader|dimission|inchiesta sul leader/i, "leader"],
];

const PARTY_WORDS: [RegExp, string][] = [
  [/fratelli|meloni|\bfdi\b/i, "fratelli-ditalia"],
  [/\bpd\b|democratico|schlein/i, "partito-democratico"],
  [/cinque stelle|\bm5s\b|conte/i, "movimento-5-stelle"],
  [/lega|salvini/i, "lega"],
  [/forza italia|\bfi\b|tajani/i, "forza-italia"],
  [/futuro nazionale|vannacci/i, "futuro-nazionale"],
  [/verdi|avs/i, "avss"],
  [/italia viva|\brenzi\b/i, "italia-viva"],
  [/azione|calenda/i, "azione"],
];

export interface InterpretedScenario {
  themes: Partial<Record<ScenarioTheme, number>>;
  affectedPartyIds: string[];
  note: string;
  source: "llm" | "keywords" | "empty";
}

function fromKeywords(text: string): InterpretedScenario {
  const themes: Partial<Record<ScenarioTheme, number>> = {};
  for (const [pattern, theme] of KEYWORDS) {
    if (pattern.test(text)) themes[theme] = 1;
  }
  const affectedPartyIds: string[] = [];
  if (themes.corruption || themes.leader || /scandalo/i.test(text)) {
    for (const [pattern, id] of PARTY_WORDS) {
      if (pattern.test(text) && !affectedPartyIds.includes(id)) affectedPartyIds.push(id);
    }
  }
  const names = Object.keys(themes);
  return {
    themes,
    affectedPartyIds,
    note: names.length
      ? `Testo libero letto dai temi dichiarati: ${names.join(", ")}. Senza chiave del modello linguistico non c'è un'altra lettura.`
      : "Nessun tema riconosciuto nel testo. Lo scenario non sposta i voti finché non scegli un tema.",
    source: names.length ? "keywords" : "empty",
  };
}

function asThemeMap(value: unknown): Partial<Record<ScenarioTheme, number>> {
  if (!value || typeof value !== "object") return {};
  const themes: Partial<Record<ScenarioTheme, number>> = {};
  for (const theme of THEMES) {
    const raw = (value as Record<string, unknown>)[theme];
    if (typeof raw !== "number" || !Number.isFinite(raw)) continue;
    const weight = Math.max(0, Math.min(1, raw));
    if (weight >= 0.15) themes[theme] = weight;
  }
  return themes;
}

export async function interpretScenarioText(text: string): Promise<InterpretedScenario> {
  const trimmed = text.trim().slice(0, 600);
  const keywords = fromKeywords(trimmed);
  if (!trimmed) return keywords;
  const raw = await completeJson(
    "Rispondi solo con JSON. Campi: themes (mappa di pesi 0-1 fra migration, recession, inflation, energy, security, corruption, war, pandemic, growth, environment, leader) e affectedPartyIds (id lista, solo se uno scandalo colpisce una lista). Non scrivere slogan, non giudicare persone, non aggiungere altri campi.",
    trimmed,
  );
  if (!raw) return keywords;
  try {
    const parsed = JSON.parse(raw) as { themes?: unknown; affectedPartyIds?: unknown };
    const themes = asThemeMap(parsed.themes);
    const affectedPartyIds = Array.isArray(parsed.affectedPartyIds)
      ? parsed.affectedPartyIds.filter((id): id is string => typeof id === "string").slice(0, 3)
      : keywords.affectedPartyIds;
    if (Object.keys(themes).length === 0) return keywords;
    return {
      themes,
      affectedPartyIds: affectedPartyIds.length ? affectedPartyIds : keywords.affectedPartyIds,
      note: "Testo libero interpretato dal modello linguistico sui temi dello schema. I pesi restano uno scenario, non un fatto.",
      source: "llm",
    };
  } catch {
    return keywords;
  }
}

export function scenarioFromInterpretation(
  interpretation: InterpretedScenario,
  options: {
    title?: string;
    intensity?: number;
    duration?: ScenarioInput["duration"];
    scope?: ScenarioInput["scope"];
    territory?: string;
  } = {},
): ScenarioInput {
  return {
    id: `custom-${Object.keys(interpretation.themes).join("-") || "vuoto"}`,
    title: options.title?.trim() || "Scenario personalizzato",
    intensity: options.intensity ?? 0.7,
    duration: options.duration ?? "media",
    scope: options.scope ?? "nazionale",
    territory: options.territory,
    themes: interpretation.themes,
    affectedPartyIds: interpretation.affectedPartyIds,
    origin: interpretation.source === "llm" ? "text" : "custom",
  };
}
