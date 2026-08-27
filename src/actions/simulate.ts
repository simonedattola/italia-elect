"use server";

import { z } from "zod";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { runSimulation } from "@/lib/simulation/engine";
import { generateAIAnalysis } from "@/lib/ai/generate";
import { PARTIES } from "@/lib/electoral/parties";
import { recognizeCandidate, recognizeCandidateAsync } from "@/lib/intelligence/candidateRecognition";
import { identifyPublicFigure } from "@/lib/intelligence/publicFigure/engine";
import {
  asCandidateProfile,
  asCoalitions,
  asModelMeta,
  asPartyResults,
  asProvinceResults,
  asSeatAllocation,
  toJson,
} from "@/lib/json";
import type { InfluenceFactor, SimulationScenarios } from "@/types/intelligence";
import type { UiScenarioConfig } from "@/types/scenario";
import { DEFAULT_UI_SCENARIO } from "@/types/scenario";
import { buildFunAnalysis } from "@/lib/ai/funAnalysis";

const candidateSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  partySlug: z.string().refine((s) => PARTIES.some((p) => p.slug === s), {
    message: "Partito non valido",
  }),
  description: z.string().min(20).max(5000),
  program: z.string().max(10000).optional(),
  photoUrl: z.string().url().optional().or(z.literal("")),
  /** Wikidata ID confermato dall'utente in caso di omonimi */
  confirmedWikidataId: z.string().max(32).optional(),
  /** Procedi come sconosciuto nonostante omonimi ambigui */
  proceedAsUnknown: z.boolean().optional(),
  scenario: z
    .object({
      uiMode: z.enum(["analyst", "fun"]).optional(),
      chaosMode: z.boolean().optional(),
      partyVoteAdjustments: z.record(z.string(), z.number()).optional(),
      activeCoalitions: z.record(z.string(), z.boolean()).optional(),
      partyThreshold: z.number().min(0).max(10).optional(),
      turnout: z.number().min(50).max(90).optional(),
      useRosatellum: z.boolean().optional(),
      seed: z.number().optional(),
    })
    .optional(),
});

export type ConfirmationOption = {
  wikidataId?: string;
  label: string;
  description: string;
  confidence: number;
  wikipediaUrl?: string;
  roleCategory: string;
};

export type SimulateState =
  | { ok: true; id: string; slug: string }
  | {
      ok: false;
      error: string;
      needsConfirmation?: true;
      prompt?: string;
      options?: ConfirmationOption[];
    };

async function upsertCandidateCache(
  firstName: string,
  lastName: string,
  partySlug: string,
  profile: unknown,
  publicFigure?: Awaited<ReturnType<typeof identifyPublicFigure>>
) {
  const rec = publicFigure
    ? (await recognizeCandidateAsync(firstName, lastName, partySlug))
    : recognizeCandidate(firstName, lastName, partySlug);
  await prisma.candidateProfileCache.upsert({
    where: { normalizedKey: rec.normalizedKey },
    create: {
      firstName: rec.firstName,
      lastName: rec.lastName,
      normalizedKey: rec.normalizedKey,
      category: rec.category,
      biography: rec.biography,
      career: rec.career,
      sources: toJson(rec.sources),
      notoriety: rec.notoriety,
      mediaExposure: rec.mediaExposure,
      perceivedLeadership: rec.perceivedLeadership,
      partyCompatibility: rec.partyCompatibility,
      electoralImpact: toJson(rec.electoralImpact),
      profileScores: toJson(profile),
      controversyNotes: toJson(rec.controversyNotes),
      reliability: rec.reliability,
      lastVerifiedAt: new Date(),
      identifiers: toJson({
        aliasesRejected: rec.aliasesRejected,
        personalBrandScore: publicFigure?.personalBrandScore,
        wikidataId: publicFigure?.wikidataId,
        recognitionMethod: publicFigure?.recognitionMethod,
      }),
    },
    update: {
      category: rec.category,
      biography: rec.biography,
      career: rec.career,
      sources: toJson(rec.sources),
      notoriety: rec.notoriety,
      mediaExposure: rec.mediaExposure,
      perceivedLeadership: rec.perceivedLeadership,
      partyCompatibility: rec.partyCompatibility,
      electoralImpact: toJson(rec.electoralImpact),
      profileScores: toJson(profile),
      controversyNotes: toJson(rec.controversyNotes),
      reliability: rec.reliability,
      lastVerifiedAt: new Date(),
      identifiers: toJson({
        personalBrandScore: publicFigure?.personalBrandScore,
        wikidataId: publicFigure?.wikidataId,
        recognitionMethod: publicFigure?.recognitionMethod,
      }),
    },
  });
  return rec;
}

export async function createSimulation(
  raw: z.infer<typeof candidateSchema>
): Promise<SimulateState> {
  const parsed = candidateSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  const data = parsed.data;
  const seed = Math.floor(Math.random() * 1e9);
  const uiScenario: UiScenarioConfig = {
    ...DEFAULT_UI_SCENARIO,
    ...(data.scenario as Partial<UiScenarioConfig> | undefined),
    partyVoteAdjustments: {
      ...DEFAULT_UI_SCENARIO.partyVoteAdjustments,
      ...(data.scenario?.partyVoteAdjustments ?? {}),
    },
    activeCoalitions: {
      ...DEFAULT_UI_SCENARIO.activeCoalitions,
      ...(data.scenario?.activeCoalitions ?? {}),
    },
  };
  if (uiScenario.uiMode === "fun") uiScenario.chaosMode = true;

  try {
    // PRIORITÀ: Entity Resolution PRIMA della simulazione
    const identified = await recognizeCandidateAsync(
      data.firstName,
      data.lastName,
      data.partySlug,
      {
        description: data.description,
        confirmedWikidataId: data.confirmedWikidataId,
      }
    );

    const fig = identified.publicFigure;

    // Omonimi / bassa confidenza: chiedi conferma (salvo proceedAsUnknown)
    if (
      fig.needsConfirmation &&
      !data.confirmedWikidataId &&
      !data.proceedAsUnknown
    ) {
      return {
        ok: false,
        error: fig.confirmationPrompt ?? fig.message,
        needsConfirmation: true,
        prompt: fig.confirmationPrompt ?? fig.message,
        options: (fig.candidateOptions ?? []).map((o) => ({
          wikidataId: o.wikidataId,
          label: o.label,
          description: o.description,
          confidence: o.confidence,
          wikipediaUrl: o.wikipediaUrl,
          roleCategory: o.roleCategory,
        })),
      };
    }

    // proceedAsUnknown → forza profilo non pubblico per il motore
    const publicFigureForEngine =
      data.proceedAsUnknown && !data.confirmedWikidataId
        ? {
            ...fig,
            publicFigure: false,
            category: "UNKNOWN" as const,
            roleCategory: "unknown" as const,
            insufficientData: true,
            needsConfirmation: false,
            confidence: 0,
            personalBrandScore: Math.min(fig.personalBrandScore, 18),
            notorietyScore: 10,
            publicRecognition: 10,
            message:
              "Candidato trattato come non riconosciuto su richiesta utente.",
          }
        : fig;

    const output = runSimulation({
      candidate: {
        firstName: data.firstName,
        lastName: data.lastName,
        partySlug: data.partySlug,
        description: data.description,
        program: data.program,
        photoUrl: data.photoUrl || undefined,
      },
      seed,
      scenario: uiScenario,
      recognition: {
        ...identified,
        category: publicFigureForEngine.publicFigure
          ? identified.category
          : "UNKNOWN",
        notoriety: publicFigureForEngine.publicFigure
          ? identified.notoriety
          : Math.min(identified.notoriety, 20),
      },
      publicFigure: publicFigureForEngine,
    });

    await upsertCandidateCache(
      data.firstName,
      data.lastName,
      data.partySlug,
      output.profile,
      publicFigureForEngine
    );

    const analysis = await generateAIAnalysis(data, output, output.profile);
    const funAnalysis = buildFunAnalysis(data, output, uiScenario);
    const scenariosPayload: SimulationScenarios = {
      ...output.scenarios,
      uiScenario,
      funAnalysis,
    };

    const candidate = await prisma.candidate.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        partySlug: data.partySlug,
        description: data.description,
        program: data.program,
        photoUrl: data.photoUrl || null,
        isPublicFigure: output.profile.isPublicFigure,
        profile: toJson(output.profile),
      },
    });

    const slug = nanoid(10);
    const simulation = await prisma.simulation.create({
      data: {
        slug,
        candidateId: candidate.id,
        status: "COMPLETED",
        seed,
        nationalResults: toJson(output.nationalResults),
        chamberSeats: toJson(output.chamberSeats),
        senateSeats: toJson(output.senateSeats),
        coalitions: toJson(output.coalitions),
        provincialMap: toJson(output.provincialMap),
        winProbability: output.winProbability,
        confidenceLow: output.confidenceLow,
        confidenceHigh: output.confidenceHigh,
        analysis,
        modelMeta: toJson(output.modelMeta),
        influenceFactors: toJson(output.influenceFactors),
        scenarios: toJson(scenariosPayload),
      },
    });

    return { ok: true, id: simulation.id, slug: simulation.slug };
  } catch (e) {
    console.error(e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Errore durante la simulazione",
    };
  }
}

export async function getSimulationBySlug(slug: string) {
  const sim = await prisma.simulation.findUnique({
    where: { slug },
    include: { candidate: true },
  });
  if (!sim) return null;

  return {
    id: sim.id,
    slug: sim.slug,
    createdAt: sim.createdAt.toISOString(),
    winProbability: sim.winProbability,
    confidenceLow: sim.confidenceLow,
    confidenceHigh: sim.confidenceHigh,
    analysis: sim.analysis,
    isPublic: sim.isPublic,
    shareSlug: sim.shareSlug,
    nationalResults: asPartyResults(sim.nationalResults),
    chamberSeats: asSeatAllocation(sim.chamberSeats),
    senateSeats: asSeatAllocation(sim.senateSeats),
    coalitions: asCoalitions(sim.coalitions),
    provincialMap: asProvinceResults(sim.provincialMap),
    modelMeta: asModelMeta(sim.modelMeta),
    influenceFactors: (sim.influenceFactors ?? []) as unknown as InfluenceFactor[],
    scenarios: (sim.scenarios ?? null) as unknown as SimulationScenarios | null,
    candidate: {
      id: sim.candidate.id,
      firstName: sim.candidate.firstName,
      lastName: sim.candidate.lastName,
      partySlug: sim.candidate.partySlug,
      description: sim.candidate.description,
      program: sim.candidate.program,
      photoUrl: sim.candidate.photoUrl,
      isPublicFigure: sim.candidate.isPublicFigure,
      profile: asCandidateProfile(sim.candidate.profile),
    },
  };
}

export async function listSimulations(limit = 30) {
  const rows = await prisma.simulation.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: { candidate: true },
  });

  return rows.map((s) => ({
    id: s.id,
    slug: s.slug,
    createdAt: s.createdAt.toISOString(),
    winProbability: s.winProbability,
    confidenceLow: s.confidenceLow,
    confidenceHigh: s.confidenceHigh,
    candidateName: `${s.candidate.firstName} ${s.candidate.lastName}`,
    partySlug: s.candidate.partySlug,
    isPublic: s.isPublic,
    shareSlug: s.shareSlug,
  }));
}

export async function publishSimulation(slug: string) {
  const shareSlug = nanoid(12);
  const sim = await prisma.simulation.update({
    where: { slug },
    data: { isPublic: true, shareSlug },
  });
  return { shareSlug: sim.shareSlug! };
}

export async function getPublicSimulation(shareSlug: string) {
  const sim = await prisma.simulation.findFirst({
    where: { shareSlug, isPublic: true },
  });
  if (!sim) return null;
  return getSimulationBySlug(sim.slug);
}

export async function recognizePublicFigure(
  firstName: string,
  lastName: string,
  partySlug: string,
  description?: string
) {
  const identified = await recognizeCandidateAsync(firstName, lastName, partySlug, {
    description,
  });
  const fig = identified.publicFigure;
  return {
    fromCache: fig.fromCache,
    figuraPubblica: fig.publicFigure,
    canonicalName: fig.canonicalName,
    category: fig.category,
    roleCategory: fig.roleCategory,
    identity: fig.identity,
    confidence: fig.confidence,
    needsConfirmation: fig.needsConfirmation,
    confirmationPrompt: fig.confirmationPrompt,
    candidateOptions: fig.candidateOptions,
    notoriety: fig.notorietyScore,
    mediaExposure: fig.mediaExposureScore,
    polarization: fig.polarizationScore,
    personalBrandScore: fig.personalBrandScore,
    biography: fig.biography,
    politicalHistory: fig.politicalHistory,
    associatedParties: fig.associatedParties,
    positions: fig.positions,
    reliability: identified.reliability,
    message: fig.message,
    sources: fig.sources,
    method: fig.recognitionMethod,
  };
}
