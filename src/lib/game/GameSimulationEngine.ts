/**
 * Motore simulazione partita — integra baseline, candidati, VP, ridistribuzione, mappe.
 */
import { getGameBaseline } from "./gameBaseline";
import { PARTIES } from "@/lib/electoral/parties";
import { buildProvincialMapFromNational } from "@/lib/electoral/provincialMap";
import { normalizePartyShares } from "@/lib/electoral/normalizeShares";
import { allocateChamberSeats, allocateSenateSeats } from "@/lib/simulation/seats";
import { PROVINCES } from "@/lib/electoral/provinces";
import { createRng, clamp, mean } from "@/lib/utils";
import { candidateRecognizer } from "./CandidateRecognizer";
import { computeVicePresidentEffect } from "./VicePresidentEffect";
import { voterRedistribution } from "./VoterRedistribution";
import { ITALIAN_CANDIDATE_POOL, partyFromSlug } from "./computer/candidatePool";
import type {
  CandidateGameProfile,
  GamePlayer,
  GameSimulationOptions,
  GameSimulationResult,
  PlayerGameResult,
  RegionalGameResult,
} from "./types";

interface ResolvedPlayer {
  player: GamePlayer;
  profile: CandidateGameProfile;
}

async function resolvePlayer(player: GamePlayer): Promise<ResolvedPlayer> {
  const program = player.candidate.program ?? "";
  const profile = await candidateRecognizer.recognize(
    player.candidate,
    player.party,
    program,
  );
  const vpEffect = await computeVicePresidentEffect(
    player.vicePresident,
    player.party,
    profile.compatibility,
  );
  profile.vicePresidentEffect = vpEffect;
  return { player, profile };
}

function applyCandidateToShare(
  baseShare: number,
  profile: CandidateGameProfile,
  isCustom: boolean,
): number {
  const impact = profile.campaignImpact ?? 0.5;

  if (isCustom) {
    const strength =
      (profile.compatibility / 100) * 0.45 +
      (profile.popularity / 100) * 0.3 +
      impact * 0.25;
    const swing = profile.expectedSwingPts + profile.vicePresidentEffect;
    return clamp(strength * 24 + swing * 0.35 + profile.popularity / 15, 3, 38);
  }

  const compatFactor = 0.52 + (profile.compatibility / 100) * 0.58;
  const fameFactor = 0.82 + (profile.popularity / 100) * 0.38;
  const swing = profile.expectedSwingPts + profile.vicePresidentEffect;
  let share = baseShare * compatFactor * fameFactor + swing * 0.42;
  share += impact * 3.2;
  share += (profile.textDepth ?? 0) > 50 ? 0.8 : 0;
  return Math.max(0.35, share);
}

export class GameSimulationEngine {
  async simulate(
    players: GamePlayer[],
    options: GameSimulationOptions,
  ): Promise<GameSimulationResult> {
    const seed = options.seed ?? Math.floor(Math.random() * 1e9);
    const rng = createRng(seed);

    const activePlayers = [...players];

    if (options.mode === "singleplayer" && options.realPartySlugs?.length) {
      const humanSlugs = new Set(players.map((p) => p.party.slug));
      for (const slug of options.realPartySlugs) {
        if (humanSlugs.has(slug)) continue;
        const poolEntry = ITALIAN_CANDIDATE_POOL.find((e) => e.partySlug === slug);
        if (!poolEntry) continue;
        activePlayers.push({
          id: `ai-${slug}`,
          displayName: poolEntry.candidate.firstName + " " + poolEntry.candidate.lastName,
          party: partyFromSlug(slug),
          candidate: {
            ...poolEntry.candidate,
            description: poolEntry.description,
          },
          isComputer: true,
        });
      }
    }

    const resolved = await Promise.all(activePlayers.map(resolvePlayer));
    const presentSlugs = new Set(resolved.map((r) => r.player.party.slug));

    let shares = { ...getGameBaseline() };
    for (const p of PARTIES) {
      if (!shares[p.slug]) shares[p.slug] = 0.1;
    }
    for (const { player } of resolved) {
      if (player.party.isCustom && !shares[player.party.slug]) {
        shares[player.party.slug] = 0.5;
      }
    }

    const allSimSlugs = new Set([
      ...PARTIES.map((p) => p.slug),
      ...resolved.map((r) => r.player.party.slug),
    ]);

    if (options.redistributionMode === "candidates_only") {
      shares = voterRedistribution.redistribute(shares, presentSlugs);
    } else {
      shares = voterRedistribution.dampenAbsent(shares, presentSlugs);
    }

    const playerPartySlugs = new Set(resolved.map((r) => r.player.party.slug));
    const adjusted: Record<string, number> = { ...shares };

    for (const { player, profile } of resolved) {
      const slug = player.party.slug;
      const base = shares[slug] ?? (player.party.isCustom ? 0.5 : 3);
      adjusted[slug] = applyCandidateToShare(
        base,
        profile,
        Boolean(player.party.isCustom),
      );
    }

    for (const slug of allSimSlugs) {
      if (!playerPartySlugs.has(slug) && options.redistributionMode === "all_parties") {
        adjusted[slug] = shares[slug] ?? 0;
      }
    }

    const samples: Record<string, number>[] = [];
    const runs = 2000;
    for (let i = 0; i < runs; i++) {
      const draw = { ...adjusted };
      for (const slug of Object.keys(draw)) {
        draw[slug] = Math.max(0.2, draw[slug]! + (rng() - 0.5) * 1.8);
      }
      samples.push(normalizePartyShares(draw));
    }

    const nationalShares: Record<string, number> = {};
    const lows: Record<string, number> = {};
    const highs: Record<string, number> = {};
    for (const slug of allSimSlugs) {
      const arr = samples.map((s) => s[slug] ?? 0).sort((a, b) => a - b);
      nationalShares[slug] = mean(arr);
      lows[slug] = arr[Math.floor(arr.length * 0.1)] ?? 0;
      highs[slug] = arr[Math.floor(arr.length * 0.9)] ?? 0;
    }

    function partyMeta(slug: string, player?: GamePlayer) {
      if (player) {
        return {
          partySlug: slug,
          partyName: player.party.name,
          shortName: player.party.name.slice(0, 8),
          color: player.party.color,
        };
      }
      const p = PARTIES.find((x) => x.slug === slug);
      return {
        partySlug: slug,
        partyName: p?.name ?? slug,
        shortName: p?.shortName ?? slug,
        color: p?.color ?? "#888",
      };
    }

    const seatInput = [...allSimSlugs].map((slug) => {
      const player = resolved.find((r) => r.player.party.slug === slug)?.player;
      const meta = partyMeta(slug, player);
      return {
        ...meta,
        percentage: nationalShares[slug] ?? 0,
        percentageLow: lows[slug] ?? 0,
        percentageHigh: highs[slug] ?? 0,
        swing: 0,
        seatsChamber: 0,
        seatsSenate: 0,
      };
    });

    const chamberAlloc = allocateChamberSeats(seatInput);
    const senateAlloc = allocateSenateSeats(seatInput);

    const playerResults: PlayerGameResult[] = resolved.map(({ player, profile }) => {
      const slug = player.party.slug;
      const pct = nationalShares[slug] ?? 0;
      const chamberSeats = chamberAlloc.byParty[slug] ?? 0;
      const senateSeats = senateAlloc.byParty[slug] ?? 0;
      return {
        playerId: player.id,
        displayName: player.displayName,
        partySlug: slug,
        partyName: player.party.name,
        partyColor: player.party.color,
        candidateName: profile.name,
        percentage: Math.round(pct * 10) / 10,
        percentageLow: Math.round((lows[slug] ?? 0) * 10) / 10,
        percentageHigh: Math.round((highs[slug] ?? 0) * 10) / 10,
        chamberSeats,
        senateSeats,
        totalSeats: chamberSeats + senateSeats,
        profile,
        won: false,
      };
    });

    playerResults.sort((a, b) => b.totalSeats - a.totalSeats);
    const winner = playerResults[0]!;
    winner.won = true;
    for (let i = 1; i < playerResults.length; i++) {
      playerResults[i]!.won = playerResults[i]!.totalSeats === winner.totalSeats;
    }

    const topPlayer = playerResults[0]!;
    const provincialMap = buildProvincialMapFromNational(nationalShares, {
      leaderSlug: topPlayer.partySlug,
      seed,
    });

    const regionMap = new Map<string, RegionalGameResult>();
    for (const prov of PROVINCES) {
      const existing = regionMap.get(prov.regionName);
      const provResult = provincialMap.find((p) => p.provinceCode === prov.code);
      if (!provResult) continue;
      if (!existing || provResult.percentage > existing.percentage) {
        regionMap.set(prov.regionName, {
          regionName: prov.regionName,
          winnerSlug: provResult.winnerSlug,
          winnerName: provResult.winnerName,
          winnerColor: provResult.winnerColor,
          percentage: provResult.percentage,
          partyShares: {},
        });
      }
    }

    const narrative = buildNarrative(playerResults, winner);
    const comparisonTable = playerResults.map((r) => ({
      name: r.candidateName,
      party: r.partyName,
      percentage: r.percentage,
      seats: r.totalSeats,
      position: r.profile.positionLabel,
    }));

    return {
      mode: options.mode,
      seed,
      players: playerResults,
      winner,
      nationalShares,
      regionalResults: [...regionMap.values()],
      provincialMap,
      narrative,
      comparisonTable,
    };
  }
}

function buildNarrative(players: PlayerGameResult[], winner: PlayerGameResult): string {
  const lines = [
    `${winner.candidateName} (${winner.partyName}) vince con ${winner.totalSeats} seggi (${winner.percentage}%).`,
    `Compatibilità ${winner.profile.compatibility}% · popolarità ${winner.profile.popularity}/100.`,
  ];
  if (winner.profile.programSummary && winner.profile.programSummary !== "Testo breve o assente.") {
    lines.push(`Programma: ${winner.profile.programSummary}.`);
  }
  if ((winner.profile.textSwingPts ?? 0) > 0.8) {
    lines.push(
      `Descrizione e programma hanno dato un boost di +${winner.profile.textSwingPts!.toFixed(1)} punti percentuali.`,
    );
  } else if ((winner.profile.textSwingPts ?? 0) < -0.8) {
    lines.push(
      `Tensione tra testo elettorale e partito: ${winner.profile.textSwingPts!.toFixed(1)}pp.`,
    );
  }
  if (winner.profile.vicePresidentEffect > 0) {
    lines.push(`Il vicepresidente ha contribuito con +${winner.profile.vicePresidentEffect.toFixed(1)}pp.`);
  }
  const runner = players[1];
  if (runner) {
    lines.push(
      `${runner.candidateName} si ferma a ${runner.totalSeats} seggi (${runner.percentage}%), gap di ${winner.totalSeats - runner.totalSeats} seggi.`,
    );
  }
  return lines.join(" ");
}

export const gameSimulationEngine = new GameSimulationEngine();
