/**
 * Public Figure Recognition Engine — Entity Resolution
 *
 * Pipeline:
 * 1. Cache locale
 * 2. Knowledge base curata
 * 3. Wikidata → Wikipedia → DBpedia → istituzionale
 * 4. LLM synthesis (opzionale)
 * 5. CandidateProfile strutturato
 *
 * Confidenza < 70 → needsConfirmation (non auto-assegna).
 */

import type { IdentifyContext, PublicFigureProfile, RoleCategory } from "./types";
import { CONFIDENCE_AUTO_THRESHOLD } from "./types";
import {
  CURATED_PUBLIC_FIGURES,
  findCuratedFigure,
  findCuratedBySurname,
  normalizePersonKey,
} from "./knowledgeBase";
import { readFigureCache, writeFigureCache } from "./cache";
import { brandLabelIt, computePersonalBrand } from "./personalBrand";
import {
  retrievePublicFigureCandidates,
  toEntityCandidates,
} from "./retrieval";
import { maybeLlmEnrichBiography, synthesizeProfile } from "./synthesize";

function roleFromIdentity(identity: PublicFigureProfile["identity"]): RoleCategory {
  switch (identity) {
    case "politician":
    case "former_politician":
    case "institutional":
      return "politician";
    case "entrepreneur":
      return "entrepreneur";
    case "media_figure":
      return "media";
    case "other_public":
      return "local_public_figure";
    default:
      return "unknown";
  }
}

function unknownProfile(firstName: string, lastName: string): PublicFigureProfile {
  const brand = computePersonalBrand({
    publicRecognition: 10,
    mediaExposure: 8,
    category: "UNKNOWN",
    insufficientData: true,
  });
  return {
    name: `${firstName} ${lastName}`,
    canonicalName: `${firstName} ${lastName}`,
    firstName,
    lastName,
    normalizedKey: normalizePersonKey(firstName, lastName),
    publicFigure: false,
    confidence: 0,
    identity: "unknown",
    category: "UNKNOWN",
    roleCategory: "unknown",
    biography: "",
    politicalHistory: [],
    positions: [],
    partyHistory: [],
    associatedParties: [],
    occupations: [],
    importantDates: [],
    mediaExposure: 8,
    publicRecognition: 10,
    notorietyScore: 10,
    mediaExposureScore: 8,
    polarizationScore: 20,
    controversies: {
      verifiedFacts: [],
      proceedings: [],
      finalConvictions: [],
      accusations: [],
      publicOpinions: [],
    },
    sources: [],
    personalBrandScore: brand.score,
    lastUpdated: new Date().toISOString(),
    fromCache: false,
    recognitionMethod: "none",
    insufficientData: true,
    needsConfirmation: false,
    message:
      "Non sono disponibili informazioni sufficienti sul candidato: la simulazione si basa solo sui dati inseriti.",
  };
}

function hydrate(profile: PublicFigureProfile): PublicFigureProfile {
  const roleCategory = profile.roleCategory ?? roleFromIdentity(profile.identity);
  const publicFigure =
    profile.publicFigure ??
    (profile.category !== "UNKNOWN" && !profile.insufficientData);
  const confidence =
    profile.confidence ??
    (publicFigure
      ? profile.recognitionMethod === "knowledge_base"
        ? 96
        : 80
      : 0);
  const notorietyScore = profile.notorietyScore ?? profile.publicRecognition;
  return {
    ...profile,
    canonicalName: profile.canonicalName || profile.name,
    publicFigure,
    confidence,
    roleCategory,
    associatedParties: profile.associatedParties ?? profile.partyHistory ?? [],
    occupations: profile.occupations ?? [],
    importantDates: profile.importantDates ?? [],
    notorietyScore,
    mediaExposureScore: profile.mediaExposureScore ?? profile.mediaExposure,
    polarizationScore:
      profile.polarizationScore ?? profile.inferredScores?.polarization ?? 40,
    needsConfirmation: profile.needsConfirmation ?? false,
  };
}

function fromCurated(
  firstName: string,
  lastName: string
): PublicFigureProfile | null {
  let seed = findCuratedFigure(firstName, lastName);
  if (!seed && firstName.toLowerCase() === lastName.toLowerCase()) {
    seed = findCuratedBySurname(firstName);
  }
  if (!seed) return null;

  if (seed.identity === "media_figure" && seed.partyHistory.length === 0) {
    return null;
  }

  const brand = computePersonalBrand({
    publicRecognition: seed.publicRecognition,
    mediaExposure: seed.mediaExposure,
    category: seed.category,
    inferredScores: seed.inferredScores,
    insufficientData: false,
  });

  const roleCategory = roleFromIdentity(seed.identity);

  return {
    name: `${seed.firstName} ${seed.lastName}`,
    canonicalName: `${seed.firstName} ${seed.lastName}`,
    firstName: seed.firstName,
    lastName: seed.lastName,
    normalizedKey: normalizePersonKey(seed.firstName, seed.lastName),
    publicFigure: true,
    confidence: 96,
    identity: seed.identity,
    category: seed.category,
    roleCategory,
    biography: seed.biography,
    politicalHistory: seed.politicalHistory,
    positions: seed.positions,
    partyHistory: seed.partyHistory,
    associatedParties: seed.partyHistory,
    occupations: [],
    importantDates: [],
    mediaExposure: seed.mediaExposure,
    publicRecognition: seed.publicRecognition,
    notorietyScore: seed.publicRecognition,
    mediaExposureScore: seed.mediaExposure,
    polarizationScore: seed.inferredScores?.polarization ?? 50,
    controversies: seed.controversies,
    sources: seed.sources,
    wikidataId: seed.wikidataId,
    wikipediaUrl: seed.wikipediaUrl,
    defaultPartySlug: seed.defaultPartySlug,
    ideologyHint: seed.ideologyHint,
    inferredScores: seed.inferredScores,
    personalBrandScore: brand.score,
    lastUpdated: new Date().toISOString(),
    fromCache: false,
    recognitionMethod: "knowledge_base",
    insufficientData: false,
    needsConfirmation: false,
    message: `Figura pubblica riconosciuta (${seed.category === "NATIONAL_PUBLIC" ? "nazionale" : "locale"} · ${roleCategory}). Personal Brand Score: ${brand.score}/100 (${brandLabelIt(brand.label)}).`,
  };
}

/**
 * Identifica una figura pubblica. Entry point principale.
 */
export async function identifyPublicFigure(
  firstName: string,
  lastName: string,
  opts?: IdentifyContext
): Promise<PublicFigureProfile> {
  const fn = firstName.trim();
  const ln = lastName.trim();
  if (!fn || !ln) return unknownProfile(fn || "?", ln || "?");

  const threshold = opts?.confidenceThreshold ?? CONFIDENCE_AUTO_THRESHOLD;

  // 1. Knowledge base curata (prioritaria — dati elettorali verificati)
  if (!opts?.confirmedWikidataId) {
    const curated = fromCurated(fn, ln);
    if (curated) {
      await writeFigureCache(curated);
      return curated;
    }
  }

  // 2. Cache locale
  if (!opts?.confirmedWikidataId) {
    const cached = await readFigureCache(fn, ln);
    if (
      cached &&
      !cached.insufficientData &&
      !cached.needsConfirmation &&
      (cached.confidence ?? 0) >= threshold
    ) {
      const kbMerge = fromCurated(fn, ln);
      if (kbMerge) {
        await writeFigureCache(kbMerge);
        return kbMerge;
      }
      return hydrate({ ...cached, fromCache: true, recognitionMethod: "cache" });
    }
  }

  // 3–5. Entity resolution remota
  if (!opts?.skipRemote) {
    const retrieved = await retrievePublicFigureCandidates(fn, ln, opts);
    const options = toEntityCandidates(retrieved);
    const best = retrieved[0] ?? null;
    let profile = synthesizeProfile({
      firstName: fn,
      lastName: ln,
      best,
      options,
      threshold,
    });

    if (profile.publicFigure) {
      profile = await maybeLlmEnrichBiography(profile);
      await writeFigureCache(profile);
    }

    return profile;
  }

  return unknownProfile(fn, ln);
}

/** Test sync helper (solo KB, no network) */
export function identifyPublicFigureSync(
  firstName: string,
  lastName: string
): PublicFigureProfile {
  return fromCurated(firstName, lastName) ?? unknownProfile(firstName, lastName);
}

export function listCuratedKeys(): string[] {
  return CURATED_PUBLIC_FIGURES.map((f) =>
    normalizePersonKey(f.firstName, f.lastName)
  );
}

export { computePersonalBrand, brandLabelIt, normalizePersonKey };
export type { IdentifyContext };
