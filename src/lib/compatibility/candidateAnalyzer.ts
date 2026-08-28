import { matchHistoricalFigure } from "./historicalFigures";
import { getParty } from "../electoral/parties";
import {
  analyzeCandidateText,
  inferTextIdeology,
  textDepth,
} from "@/lib/intelligence/candidateTextSignals";
import { clamp } from "@/lib/utils";

export interface CandidateAnalysis {
  name: string;
  partySlug: string;
  ideologyScore: number;
  reputation: number;
  historicalScore: number;
  statementsScore: number;
  affinityScore: number;
  isHistoricalFigure: boolean;
}

const LEADER_RE =
  /presidente del consiglio|segretario|leader|ministro|europarlament|sindaco|generale/i;
const SCANDAL_RE =
  /corruzion|inchiesta|condannat|scandal|indagat|processo|mazzette|tangent/i;
const COMPETENCE_RE =
  /ministro|sindaco|parlament|europarlament|generale|manager|ceo|imprenditor|professor/i;

export function analyzeCandidate(input: {
  firstName: string;
  lastName: string;
  partySlug: string;
  description?: string;
  program?: string;
}): CandidateAnalysis {
  const name = `${input.firstName} ${input.lastName}`;
  const hist = matchHistoricalFigure(input.firstName, input.lastName);
  const desc = (input.description ?? "").trim();
  const program = (input.program ?? "").trim();
  const blob = `${desc} ${program}`.toLowerCase();
  const party = getParty(input.partySlug);

  let ideologyScore = hist?.ideologyScore ?? 0;
  let reputation = hist?.reputation ?? 0.5;
  let historicalScore = hist ? 0.7 : 0.4;
  let statementsScore = 0.5;
  let affinityScore = 0.5;

  if (blob.length >= 15) {
    const inferred = inferTextIdeology(blob);
    if (hist) {
      ideologyScore = clamp((ideologyScore + inferred) / 2, -1, 1);
    } else {
      ideologyScore = inferred;
    }

    if (party) {
      const signals = analyzeCandidateText(desc, party, program || undefined);
      const align = 1 - signals.ideologyGap;
      statementsScore = clamp(0.35 + align * 0.55, 0.1, 0.95);
      affinityScore = clamp(0.3 + align * 0.5 + (signals.depth / 100) * 0.2, 0.1, 0.95);
      historicalScore = clamp(0.35 + align * 0.45, 0.15, 0.9);
    }

    const depth = textDepth(desc, program || undefined);
    reputation += (depth / 100) * 0.12;
    if (LEADER_RE.test(blob)) reputation += 0.12;
    if (COMPETENCE_RE.test(blob)) reputation += 0.08;
    if (SCANDAL_RE.test(blob)) reputation -= 0.35;
  }

  ideologyScore = clamp(ideologyScore, -1, 1);
  reputation = clamp(reputation, 0, 1);

  return {
    name,
    partySlug: input.partySlug,
    ideologyScore,
    reputation,
    historicalScore,
    statementsScore,
    affinityScore,
    isHistoricalFigure: hist != null,
  };
}
