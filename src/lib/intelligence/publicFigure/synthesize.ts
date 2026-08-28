/**
 * Sintesi CandidateProfile strutturato da fonti recuperate.
 * LLM opzionale (OPENAI_API_KEY) — altrimenti merge deterministico.
 */

import type { RetrievedEntity } from "./retrieval";
import type {
  FigureIdentityKind,
  PublicFigureProfile,
  RoleCategory,
  ScopeCategory,
} from "./types";
import { computePersonalBrand } from "./personalBrand";
import { brandLabelIt } from "./personalBrand";
import { normalizePersonKey } from "./knowledgeBase";
import {
  confirmationPromptFor,
  isElectoralPublicFigure,
  shouldAutoAssign,
} from "./entityResolution";
import { CONFIDENCE_AUTO_THRESHOLD } from "./types";
import type { EntityCandidate } from "./types";
import { inferIdeologyAxis } from "@/lib/intelligence/electoralCompatibility";

function identityFromRole(
  role: RoleCategory,
  description: string
): FigureIdentityKind {
  if (role === "politician") {
    if (/ex |former|decedut|mort/i.test(description)) return "former_politician";
    return "politician";
  }
  if (role === "entrepreneur") return "entrepreneur";
  if (role === "media") return "media_figure";
  if (role === "local_public_figure") return "other_public";
  if (role === "other") return "other_public";
  return "unknown";
}

function scopeFrom(role: RoleCategory, nationalHint: boolean): ScopeCategory {
  if (role === "unknown") return "UNKNOWN";
  if (role === "local_public_figure") return "LOCAL_PUBLIC";
  if (nationalHint || role === "politician" || role === "entrepreneur" || role === "media") {
    return nationalHint ? "NATIONAL_PUBLIC" : "LOCAL_PUBLIC";
  }
  return "LOCAL_PUBLIC";
}

function estimateNotoriety(entity: RetrievedEntity, scope: ScopeCategory): number {
  const text = `${entity.person.description} ${entity.person.extract ?? ""} ${entity.dbpediaComment ?? ""}`;
  let n = 40;
  if (scope === "NATIONAL_PUBLIC") n = 78;
  if (scope === "LOCAL_PUBLIC") n = 52;
  if (/presidente del consiglio|premier|prime minister/i.test(text)) n = Math.max(n, 94);
  if (/presidente della repubblica/i.test(text)) n = Math.max(n, 90);
  if (/fondatore|leader|segretar/i.test(text)) n = Math.max(n, n + 6);
  if (entity.person.positionLabels.length >= 3) n += 6;
  if (entity.wikipediaCategories.some((c) => /politic/i.test(c))) n += 4;
  if (/criminal|omicid|rapin/i.test(text) && !entity.person.isPoliticianLike) n = Math.min(n, 45);
  return Math.max(15, Math.min(99, Math.round(n)));
}

function buildInferred(notoriety: number, role: RoleCategory, polarizationSeed: number) {
  return {
    credibility: Math.round(42 + notoriety * 0.2),
    experience: role === "politician" ? Math.round(50 + notoriety * 0.35) : 40,
    competence: Math.round(45 + notoriety * 0.25),
    leadership: Math.round(40 + notoriety * 0.4),
    communication: Math.round(45 + notoriety * 0.35),
    popularity: Math.round(30 + notoriety * 0.35),
    scandalRisk: Math.round(polarizationSeed > 70 ? 55 : 28),
    mediaConsensus: Math.round(40 + notoriety * 0.25),
    socialConsensus: Math.round(38 + notoriety * 0.28),
    undecidedAppeal: Math.round(35 + (100 - polarizationSeed) * 0.2),
    mobilization: Math.round(35 + notoriety * 0.4),
    trust: Math.round(40 + notoriety * 0.15 - polarizationSeed * 0.1),
    polarization: Math.round(polarizationSeed),
    personalLoyalty: Math.round(35 + notoriety * 0.35),
  };
}

function politicalHistoryFrom(entity: RetrievedEntity): string[] {
  const hist: string[] = [];
  if (entity.person.description) hist.push(entity.person.description);
  for (const p of entity.person.positionLabels.slice(0, 5)) {
    hist.push(`Incarico: ${p}`);
  }
  for (const p of entity.person.partyLabels.slice(0, 4)) {
    hist.push(`Partito associato: ${p}`);
  }
  return hist;
}

/**
 * Merge deterministico → PublicFigureProfile.
 */
export function synthesizeProfile(args: {
  firstName: string;
  lastName: string;
  best: RetrievedEntity | null;
  options: EntityCandidate[];
  threshold?: number;
}): PublicFigureProfile {
  const threshold = args.threshold ?? CONFIDENCE_AUTO_THRESHOLD;
  const { firstName, lastName, best, options } = args;

  if (!best) {
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

  const auto = shouldAutoAssign(best.confidence, threshold);
  const role = best.person.roleCategory;
  const nationalHint =
    best.person.isItalian &&
    (best.person.isPoliticianLike ||
      /nazionale|presidente|ministro|senat|deputat/i.test(
        best.person.description + best.person.positionLabels.join(" ")
      ));
  const scope = auto
    ? scopeFrom(role, nationalHint)
    : ("UNKNOWN" as ScopeCategory);
  const publicFigure = isElectoralPublicFigure(role, best.confidence, auto);
  const notoriety = publicFigure ? estimateNotoriety(best, scope === "UNKNOWN" ? "LOCAL_PUBLIC" : scope) : 12;
  const media = publicFigure ? Math.round(notoriety * 0.9) : 10;
  const polarization =
    role === "politician" ? Math.min(92, 40 + notoriety * 0.4) : 35;
  const inferred = buildInferred(notoriety, role, polarization);
  const brand = computePersonalBrand({
    publicRecognition: notoriety,
    mediaExposure: media,
    category: publicFigure ? scope : "UNKNOWN",
    inferredScores: inferred,
    insufficientData: !publicFigure,
  });

  const biography =
    best.person.extract ||
    best.dbpediaComment ||
    best.person.description ||
    "";

  const needsConfirmation = !auto && options.length > 0;
  const method =
    best.dbpediaUri && best.person.wikipediaUrl
      ? ("entity_resolution" as const)
      : best.person.wikipediaUrl
        ? ("wikipedia" as const)
        : ("wikidata" as const);

  const ideologyHint = inferIdeologyAxis([
    biography,
    best.person.description,
    ...best.person.partyLabels,
    ...best.person.positionLabels,
    ...best.person.occupationLabels,
  ]);

  return {
    name: best.person.label,
    canonicalName: best.person.label,
    firstName,
    lastName,
    normalizedKey: normalizePersonKey(firstName, lastName),
    publicFigure,
    confidence: best.confidence,
    identity: publicFigure ? identityFromRole(role, biography) : "unknown",
    category: publicFigure ? scope : "UNKNOWN",
    roleCategory: publicFigure ? role : needsConfirmation ? role : "unknown",
    biography: publicFigure || needsConfirmation ? biography : "",
    politicalHistory: publicFigure ? politicalHistoryFrom(best) : [],
    positions: publicFigure ? best.person.positionLabels : [],
    partyHistory: publicFigure ? best.person.partyLabels : [],
    associatedParties: publicFigure ? best.person.partyLabels : [],
    occupations: best.person.occupationLabels,
    importantDates: best.person.importantDates,
    mediaExposure: media,
    publicRecognition: notoriety,
    notorietyScore: notoriety,
    mediaExposureScore: media,
    polarizationScore: Math.round(
      /nazionalsocial|nazista|fascis|olocausto|holocaust/i.test(biography)
        ? 99
        : polarization
    ),
    controversies: {
      verifiedFacts: biography ? [best.person.description].filter(Boolean) : [],
      proceedings: [],
      finalConvictions: [],
      accusations: [],
      publicOpinions: [],
    },
    sources: best.sources,
    wikidataId: best.person.wikidataId,
    wikipediaUrl: best.person.wikipediaUrl,
    dbpediaUri: best.dbpediaUri,
    ideologyHint: ideologyHint !== 0 ? ideologyHint : undefined,
    inferredScores: publicFigure ? inferred : undefined,
    personalBrandScore: brand.score,
    lastUpdated: new Date().toISOString(),
    fromCache: false,
    recognitionMethod: method,
    insufficientData: !publicFigure,
    needsConfirmation,
    confirmationPrompt: needsConfirmation
      ? confirmationPromptFor(options)
      : undefined,
    candidateOptions: needsConfirmation ? options : undefined,
    message: needsConfirmation
      ? confirmationPromptFor(options)
      : publicFigure
        ? `Figura pubblica riconosciuta via entity resolution (${role}). Notorietà ${notoriety}/100 · Personal Brand ${brand.score}/100 (${brandLabelIt(brand.label)}) · confidenza ${best.confidence}%.`
        : "Non sono disponibili informazioni sufficienti sul candidato: la simulazione si basa solo sui dati inseriti.",
  };
}

/**
 * Arricchimento LLM opzionale della biografia (non inventa fatti nuovi se il modello fallisce).
 */
export async function maybeLlmEnrichBiography(
  profile: PublicFigureProfile
): Promise<PublicFigureProfile> {
  if (!profile.publicFigure || !process.env.OPENAI_API_KEY) return profile;
  if (profile.biography.length > 280) return profile;

  try {
    const { generateText } = await import("ai");
    const { createOpenAI } = await import("@ai-sdk/openai");
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      temperature: 0.2,
      prompt: `Sei un assistente per un simulatore elettorale italiano.
Riscrivi in italiano, in 2-3 frasi neutre e fattuali, un profilo pubblico usando SOLO questi fatti (non inventare):
Nome: ${profile.canonicalName}
Biografia: ${profile.biography}
Incarichi: ${profile.positions.join("; ")}
Partiti: ${profile.associatedParties.join("; ")}
Occupazioni: ${profile.occupations.join("; ")}
Fonti: ${profile.sources.map((s) => s.title).join(", ")}

Output: solo il testo biografico, senza elenchi né markdown.`,
    });
    if (text && text.length > 40) {
      return {
        ...profile,
        biography: text.trim(),
        recognitionMethod: "llm_synthesis",
        sources: [
          ...profile.sources,
          { title: "Sintesi LLM su fonti strutturate", type: "llm" },
        ],
        message: profile.message + " Biografia sintetizzata da LLM sulle fonti.",
      };
    }
  } catch {
    // silenzioso: resta merge deterministico
  }
  return profile;
}
