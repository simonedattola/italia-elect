/**
 * Effetto vicepresidente sul ticket elettorale.
 */
import { candidateRecognizer } from "./CandidateRecognizer";
import type { GameCandidateInput, GamePartyChoice } from "./types";
import { swingFromVpProfile } from "./vpEffectFormula";

export async function computeVicePresidentEffect(
  vp: GameCandidateInput | undefined,
  party: GamePartyChoice,
  leaderCompat: number,
): Promise<number> {
  if (!vp?.firstName?.trim()) return 0;

  const vpProfile = await candidateRecognizer.recognize(vp, party, vp.program);
  return swingFromVpProfile(
    vpProfile.compatibility,
    vpProfile.popularity,
    leaderCompat,
    vpProfile.isPublicFigure,
  );
}
