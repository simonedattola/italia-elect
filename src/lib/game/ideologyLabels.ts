/**
 * Etichette ideologiche granulari — oltre il semplice destra/sinistra.
 */
import { clamp } from "@/lib/utils";

const THEME_IDEOLOGY: Record<string, number> = {
  Sovranità: 0.55,
  Sicurezza: 0.35,
  Immigrazione: 0.4,
  Economia: 0.1,
  Europa: -0.05,
  Ambiente: -0.45,
  Diritti: -0.4,
  Welfare: -0.35,
  Sanità: -0.2,
  Istruzione: -0.15,
};

export function ideologyLabelFromScore(score: number): string {
  if (score >= 0.82) return "Estrema destra";
  if (score >= 0.62) return "Destra sovranista";
  if (score >= 0.42) return "Centro-destra";
  if (score >= 0.18) return "Centro-destra liberale";
  if (score >= 0.06) return "Centro";
  if (score <= -0.82) return "Sinistra radicale";
  if (score <= -0.62) return "Sinistra progressista";
  if (score <= -0.42) return "Centro-sinistra";
  if (score <= -0.18) return "Centro-sinistra riformista";
  if (score <= -0.06) return "Centro";
  return "Centro trasversale";
}

export function buildPositionLabel(
  ideology: number,
  themes: string[] = [],
  opts?: { partyIdeology?: number; isPopulist?: boolean },
): string {
  const themeShift =
    themes.reduce((acc, t) => acc + (THEME_IDEOLOGY[t] ?? 0), 0) /
    Math.max(themes.length, 1);
  const adjusted = clamp(ideology + themeShift * 0.22, -1, 1);

  const qualifiers: string[] = [];
  if (themes.includes("Sovranità") || themes.includes("Immigrazione")) {
    qualifiers.push("sovranista");
  }
  if (themes.includes("Ambiente") || themes.includes("Diritti")) {
    qualifiers.push("progressista");
  }
  if (themes.includes("Economia") && adjusted > 0.15) {
    qualifiers.push("liberista");
  }
  if (themes.includes("Welfare") && adjusted < -0.1) {
    qualifiers.push("sociale");
  }
  if (opts?.isPopulist || themes.includes("Sicurezza")) {
    if (adjusted > 0.2) qualifiers.push("populista");
  }
  if (
    opts?.partyIdeology !== undefined &&
    Math.abs(adjusted - opts.partyIdeology) < 0.12 &&
    themes.length >= 2
  ) {
    qualifiers.push("coerente col partito");
  }

  const base = ideologyLabelFromScore(adjusted);
  const unique = [...new Set(qualifiers)].slice(0, 2);
  if (!unique.length) return base;
  return `${base} · ${unique.join(" · ")}`;
}

/** Etichetta per lo slider ideologia di un partito custom (0 = sinistra, 1 = destra). */
export function customPartyIdeologyLabel(score: number): string {
  if (score <= -0.75) return "Sinistra radicale ed ecologista";
  if (score <= -0.45) return "Sinistra progressista e sociale";
  if (score <= -0.2) return "Centro-sinistra riformista";
  if (score <= -0.05) return "Centro con tendenza progressista";
  if (score <= 0.05) return "Centro / Transversale";
  if (score <= 0.2) return "Centro con tendenza liberale";
  if (score <= 0.45) return "Centro-destra liberale";
  if (score <= 0.65) return "Destra conservatrice";
  if (score <= 0.8) return "Destra sovranista e populista";
  return "Estrema destra nazionalista";
}
