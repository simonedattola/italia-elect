/**
 * Effetto vicepresidente sul ticket elettorale.
 */
import { candidateRecognizer } from "./CandidateRecognizer";
import type { GameCandidateInput, GamePartyChoice } from "./types";
import { clamp } from "@/lib/utils";

export async function computeVicePresidentEffect(
  vp: GameCandidateInput | undefined,
  party: GamePartyChoice,
  leaderCompat: number,
): Promise<number> {
  if (!vp?.firstName?.trim()) return 0;

  const vpProfile = await candidateRecognizer.recognize(vp, party);
  const compatGap = vpProfile.compatibility - leaderCompat;

  if (vpProfile.compatibility >= 75 && vpProfile.popularity >= 45) {
    return clamp(3 + vpProfile.popularity / 25, 3, 9);
  }
  if (vpProfile.compatibility < 35 || compatGap < -25) {
    return clamp(-3 - (35 - vpProfile.compatibility) / 8, -10, -2);
  }
  if (vpProfile.popularity < 25) return 0;
  return clamp((vpProfile.compatibility - 50) / 15, -2, 3);
}
