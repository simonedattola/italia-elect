/**
 * Compatibility shim — il profilo candidato vive in intelligence/.
 */
export {
  buildIntelligenceProfile as buildCandidateProfile,
  candidateElectoralDelta,
} from "@/lib/intelligence/candidateProfile";

import type { CandidateProfile } from "@/types/simulation";
import { candidateElectoralDelta } from "@/lib/intelligence/candidateProfile";

/** @deprecated usare candidateElectoralDelta */
export function profileVoteMultiplier(profile: CandidateProfile): number {
  return candidateElectoralDelta(profile).multiplier;
}
