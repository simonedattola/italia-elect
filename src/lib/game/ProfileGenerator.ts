/**
 * Profilo sintetico per candidati non riconosciuti.
 */
import { candidateRecognizer } from "./CandidateRecognizer";
import type { CandidateGameProfile, GameCandidateInput, GamePartyChoice } from "./types";

export class ProfileGenerator {
  async generate(
    candidate: GameCandidateInput,
    party: GamePartyChoice,
    program?: string,
  ): Promise<CandidateGameProfile> {
    const enrichedDesc =
      candidate.description?.trim() ||
      `Candidato per ${party.name}. Leader locale con ambizioni nazionali.`;
    return candidateRecognizer.recognize(
      { ...candidate, description: enrichedDesc },
      party,
      program,
    );
  }
}

export const profileGenerator = new ProfileGenerator();
