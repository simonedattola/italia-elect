import { capoluogoLists } from "@/lib/data/capoluoghi";
import { assessLeaderWithFallback, type LeaderAssessment } from "@/lib/figures/assess";
import { REGION_NAMES } from "@/lib/electoral/canonical";
import { runSimulation, type SimulationOutput } from "@/lib/model/engine";
import { currentNationalLists, defaultCommonShockSd } from "@/lib/model/currentScenario";
import { inputFromPayload, listsFor } from "@/lib/simulator/project";
import type { ScenarioInput } from "@/lib/scenarios/types";
import type { SharePayload } from "@/lib/model/shareLink";

export interface ContestPlayerInput {
  id: string;
  displayName: string;
  partyId: string;
  partyName: string;
  color: string;
  ideology: number;
  candidateName: string;
  custom?: boolean;
}

export interface ContestRequest {
  level: "nazionali" | "regionali" | "comunali";
  territory?: string;
  seed?: number;
  scenarios?: ScenarioInput[];
  players: ContestPlayerInput[];
  /** Duello: risposte −1…+1 già trasformate in scenari dal client. */
  label?: string;
}

export interface ContestPlayerResult {
  id: string;
  displayName: string;
  partyName: string;
  color: string;
  candidateName: string;
  percentage: number;
  seats: number;
  score: number;
  won: boolean;
  assessment: LeaderAssessment;
}

export interface ContestResult {
  level: ContestRequest["level"];
  territory?: string;
  label: string;
  seed: number;
  players: ContestPlayerResult[];
  shares: { id: string; name: string; color: string; mean: number }[];
  notes: string[];
  majority: { name: string; probability: number; seats: number }[];
  regions: { name: string; color: string; label: string }[];
}

const CITIES = ["Roma", "Milano", "Napoli", "Torino", "Palermo", "Bologna", "Firenze", "Genova", "Bari", "Catania"];

export function contestTerritories(level: ContestRequest["level"]): string[] {
  if (level === "regionali") return [...REGION_NAMES];
  if (level === "comunali") return CITIES;
  return ["Italia"];
}

export async function simulateContest(request: ContestRequest): Promise<ContestResult> {
  const seed = request.seed ?? 20261023;
  const assessments = await Promise.all(
    request.players.map((player) => assessLeaderWithFallback(player.candidateName, player.partyId, player.ideology)),
  );
  const national = currentNationalLists();
  const regional = request.level === "regionali" ? listsFor("regionali", request.territory) : [];
  const municipal = request.level === "comunali" ? capoluogoLists(request.territory) : [];
  const baseLists = request.level === "regionali" && regional.length ? regional : municipal.length ? municipal : national;
  const lists = baseLists.map((list) => ({
    id: list.id,
    name: list.name,
    color: list.color,
    baseline: list.percentage,
    ideology: list.ideology ?? 0,
    coalitionId: request.level === "nazionali" ? coalitionOf(list.id) : null,
  }));
  for (const player of request.players) {
    if (!lists.some((list) => list.id === player.partyId)) {
      const assessment = assessments[request.players.indexOf(player)]!;
      lists.push({
        id: player.partyId,
        name: player.partyName,
        color: player.color,
        baseline: assessment.cap ?? Math.max(8, 6 + assessment.coherence / 25),
        ideology: player.ideology,
        coalitionId: null,
      });
    }
  }
  const payload: SharePayload = {
    v: 1,
    level: request.level === "comunali" ? "nazionali" : request.level,
    baselineId: "sondaggi-gioco",
    seed,
    runs: 500,
    sigma: 1.5,
    pollWeight: 0,
    usePolls: false,
    factors: { economy: 0, security: 0, europe: 0, costOfLiving: 0, social: 0 },
    coalitions: {},
    scenarios: request.scenarios,
    commonShockSd: request.level === "nazionali" ? defaultCommonShockSd() : 1.2,
    collegioNoiseSd: request.level === "nazionali" ? 7 : 0,
    region: request.level === "regionali" ? request.territory : undefined,
  };
  const input = inputFromPayload(payload);
  input.lists = lists.map((list) => ({
    ...list,
    coalitionId: request.level === "nazionali" ? coalitionOf(list.id) : list.coalitionId,
  }));
  input.leaderEffects = request.players.map((player, index) => {
    const assessment = assessments[index]!;
    return {
      listId: player.partyId,
      swing: assessment.swing,
      cap: assessment.cap,
      backlash: assessment.backlash,
      note: [assessment.explanation, assessment.legalNote].filter(Boolean).join(" "),
    };
  });
  if (request.level === "comunali") {
    input.level = "comunali";
    input.colleges = [];
    input.senateColleges = [];
    input.senateRegions = [];
    input.councilSeats = 32;
    input.geographyBaseline = undefined;
    input.commonShockSd = 1.4;
    input.collegioNoiseSd = 0;
  }
  if (request.level === "regionali") {
    input.colleges = [];
    input.councilSeats = 48;
    input.regionalBonusSeats = 0;
    input.geographyBaseline = undefined;
  }
  const simulated = runSimulation(input);
  return present(request, seed, simulated, assessments);
}

function coalitionOf(id: string): string | null {
  if (["fratelli-ditalia", "lega", "forza-italia", "noi-moderati", "sud-chiama-nord"].includes(id)) return "centrodestra";
  if (["partito-democratico", "movimento-5-stelle", "avss", "italia-viva", "piu-europa"].includes(id)) return "centrosinistra";
  return null;
}

function present(
  request: ContestRequest,
  seed: number,
  simulated: SimulationOutput,
  assessments: LeaderAssessment[],
): ContestResult {
  const shares = simulated.shares.map((share) => ({
    id: share.id,
    name: share.name,
    color: share.color,
    mean: share.mean,
  }));
  const players = request.players.map((player, index) => {
    const share = simulated.shares.find((item) => item.id === player.partyId);
    const seats = simulated.cameraSeats.find((item) => item.id === player.partyId);
    const percentage = Math.round((share?.mean ?? 0) * 10) / 10;
    const seatCount = Math.round(seats?.mean ?? 0);
    return {
      id: player.id,
      displayName: player.displayName,
      partyName: player.partyName,
      color: player.color,
      candidateName: assessments[index]?.displayName || player.candidateName,
      percentage,
      seats: seatCount,
      score: Math.round(percentage * 4 + seatCount * 0.35),
      won: false,
      assessment: assessments[index]!,
    };
  });
  const ranked = [...players].sort((a, b) => b.percentage - a.percentage || b.seats - a.seats);
  if (ranked[0]) ranked[0].won = true;
  const order = new Map(ranked.map((player, index) => [player.id, index]));
  players.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  return {
    level: request.level,
    territory: request.territory,
    label: request.label ?? "Partita",
    seed,
    players,
    shares: shares.filter((share) => share.mean >= 0.4).slice(0, 10),
    notes: simulated.notes,
    majority: simulated.coalitions.slice(0, 3).map((item) => ({
      name: item.name,
      probability: item.probability,
      seats: item.meanSeats,
    })),
    regions: [],
  };
}
