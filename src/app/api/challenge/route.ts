import { NextResponse } from "next/server";
import { generateAgentSample } from "@/lib/agents";
import type { DigitalAgent } from "@/lib/agents/types";
import { runNationalVoting } from "@/lib/simulation/votingEngine";
import { computeAgentCandidateCompatibility } from "@/lib/compatibility/compatibilityEngine";
import { allocateRosatellum } from "@/lib/electoral/rosatellum";

type ChallengeCandidate = {
  firstName: string;
  lastName: string;
  partySlug: string;
  description?: string;
  program?: string;
};

function populationWeightedCompat(agents: DigitalAgent[], candidate: ChallengeCandidate): number {
  let sum = 0;
  let wsum = 0;
  for (const agent of agents) {
    const w = agent.virtualWeight;
    sum += computeAgentCandidateCompatibility(agent, candidate).score * w;
    wsum += w;
  }
  return wsum > 0 ? sum / wsum : 0.5;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const p1 = body.player1 as {
      firstName: string;
      lastName: string;
      partySlug: string;
      description?: string;
      program?: string;
    };
    const p2 = body.player2 as {
      firstName: string;
      lastName: string;
      partySlug: string;
      description?: string;
      program?: string;
    };

    if (!p1?.firstName || !p2?.firstName) {
      return NextResponse.json({ ok: false, error: "Due candidati richiesti" }, { status: 400 });
    }

    const p1Desc =
      (p1.description ?? "").trim().length >= 15
        ? p1.description!.trim()
        : `${p1.firstName} ${p1.lastName} candidato per ${p1.partySlug}`;
    const p2Desc =
      (p2.description ?? "").trim().length >= 15
        ? p2.description!.trim()
        : `${p2.firstName} ${p2.lastName} candidato per ${p2.partySlug}`;

    const player1 = { ...p1, description: p1Desc };
    const player2 = { ...p2, description: p2Desc };

    const agents = generateAgentSample(4000, 42);

    const compat1 = populationWeightedCompat(agents, player1);
    const compat2 = populationWeightedCompat(agents, player2);

    const base = runNationalVoting(agents, { seed: 99 });
    const withP1 = runNationalVoting(agents, {
      seed: 99,
      candidate: player1,
      anchorStrength: 0.55,
    });
    const withP2 = runNationalVoting(agents, {
      seed: 99,
      candidate: player2,
      anchorStrength: 0.55,
    });

    const p1PartyPct = withP1.votingIntent[player1.partySlug] ?? 0;
    const p2PartyPct = withP2.votingIntent[player2.partySlug] ?? 0;
    const p1Score = p1PartyPct * (0.55 + compat1 * 0.45);
    const p2Score = p2PartyPct * (0.55 + compat2 * 0.45);
    const total = p1Score + p2Score || 1;
    const p1Share = (p1Score / total) * 100;
    const p2Share = (p2Score / total) * 100;

    const rosa = allocateRosatellum({
      nationalShares: withP1.votingIntent,
      seed: 7,
    });
    const p1Seats =
      (rosa.chamber.byParty[player1.partySlug] ?? 0) + (rosa.senate.byParty[player1.partySlug] ?? 0);
    const rosa2 = allocateRosatellum({
      nationalShares: withP2.votingIntent,
      seed: 8,
    });
    const p2Seats =
      (rosa2.chamber.byParty[player2.partySlug] ?? 0) + (rosa2.senate.byParty[player2.partySlug] ?? 0);

    const winner =
      p1Share >= p2Share
        ? { name: `${player1.firstName} ${player1.lastName}`, party: player1.partySlug }
        : { name: `${player2.firstName} ${player2.lastName}`, party: player2.partySlug };

    return NextResponse.json({
      ok: true,
      baseline: base.votingIntent,
      player1: {
        name: `${player1.firstName} ${player1.lastName}`,
        partySlug: player1.partySlug,
        sharePct: p1Share,
        partyIntentPct: p1PartyPct,
        compatibility: compat1,
        seats: p1Seats,
      },
      player2: {
        name: `${player2.firstName} ${player2.lastName}`,
        partySlug: player2.partySlug,
        sharePct: p2Share,
        partyIntentPct: p2PartyPct,
        compatibility: compat2,
        seats: p2Seats,
      },
      winner,
      marginPct: Math.abs(p1Share - p2Share),
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
