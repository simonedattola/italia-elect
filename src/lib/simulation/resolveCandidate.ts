/**
 * Risoluzione candidato — stessa logica di createSimulation (server).
 */
import type { PublicFigureProfile } from "@/lib/intelligence/publicFigure/types";
import type { RecognizedCandidate } from "@/types/intelligence";
import { recognizeCandidateAsync } from "@/lib/intelligence/candidateRecognition";

export type ResolvedCandidate = {
  identified: Awaited<ReturnType<typeof recognizeCandidateAsync>>;
  publicFigureForEngine: PublicFigureProfile;
  recognitionForEngine: RecognizedCandidate;
};

export async function resolveCandidateForSimulation(opts: {
  firstName: string;
  lastName: string;
  partySlug: string;
  description: string;
  program?: string;
  confirmedWikidataId?: string;
  proceedAsUnknown?: boolean;
}): Promise<ResolvedCandidate> {
  const identified = await recognizeCandidateAsync(
    opts.firstName,
    opts.lastName,
    opts.partySlug,
    {
      description: opts.description,
      program: opts.program,
      confirmedWikidataId: opts.confirmedWikidataId,
    },
  );

  const fig = identified.publicFigure;

  const publicFigureForEngine =
    opts.proceedAsUnknown && !opts.confirmedWikidataId
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
          message: "Candidato trattato come non riconosciuto su richiesta utente.",
        }
      : fig;

  const recognitionForEngine: RecognizedCandidate = {
    ...identified,
    category: publicFigureForEngine.publicFigure ? identified.category : "UNKNOWN",
    notoriety: publicFigureForEngine.publicFigure
      ? identified.notoriety
      : Math.min(identified.notoriety, 20),
  };

  return { identified, publicFigureForEngine, recognitionForEngine };
}
