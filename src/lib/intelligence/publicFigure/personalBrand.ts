/**
 * Personal Brand Score — impatto personale del candidato riconosciuto.
 */

import type { PersonalBrandBreakdown, PublicFigureProfile } from "./types";
import { clamp } from "@/lib/utils";

export function computePersonalBrand(
  profile: Pick<
    PublicFigureProfile,
    "publicRecognition" | "mediaExposure" | "category" | "inferredScores" | "insufficientData"
  >
): PersonalBrandBreakdown {
  if (profile.insufficientData || profile.category === "UNKNOWN") {
    const score = clamp(
      8 + profile.publicRecognition * 0.15 + profile.mediaExposure * 0.05,
      5,
      22
    );
    return {
      score: Math.round(score),
      notoriety: profile.publicRecognition,
      trust: 30,
      communication: 25,
      personalLoyalty: 15,
      polarization: 20,
      label: score < 12 ? "molto_basso" : "basso",
    };
  }

  const s = profile.inferredScores;
  const notoriety = profile.publicRecognition;
  const trust = s?.trust ?? 45;
  const communication = s?.communication ?? 50;
  const personalLoyalty = s?.personalLoyalty ?? 40;
  const polarization = s?.polarization ?? 50;

  // Polarizzazione alta non è solo negativa: aumenta mobilitazione ma riduce indecisi
  const score = clamp(
    notoriety * 0.34 +
      trust * 0.18 +
      communication * 0.18 +
      personalLoyalty * 0.2 +
      Math.min(polarization, 70) * 0.1,
    0,
    100
  );

  const label: PersonalBrandBreakdown["label"] =
    score >= 85
      ? "molto_alto"
      : score >= 70
        ? "alto"
        : score >= 45
          ? "medio"
          : score >= 25
            ? "basso"
            : "molto_basso";

  return {
    score: Math.round(score),
    notoriety,
    trust,
    communication,
    personalLoyalty,
    polarization,
    label,
  };
}

export function brandLabelIt(label: PersonalBrandBreakdown["label"]): string {
  switch (label) {
    case "molto_alto":
      return "molto alto";
    case "alto":
      return "alto";
    case "medio":
      return "medio";
    case "basso":
      return "basso";
    case "molto_basso":
      return "molto basso";
  }
}
