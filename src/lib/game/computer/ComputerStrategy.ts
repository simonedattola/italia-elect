import type { ComputerChoice, GameDifficulty, GamePlayer, ComputerOrientation } from "../types";
import {
  getPoolByOrientation,
  ITALIAN_CANDIDATE_POOL,
  partyFromSlug,
  VP_POOL,
  type PoolEntry,
} from "./candidatePool";
import { getGamePollShares } from "../gameBaseline";
import { createRng } from "@/lib/utils";

export interface ComputerStrategy {
  choose(
    humanPlayers: GamePlayer[],
    difficulty: GameDifficulty,
    orientation: ComputerOrientation,
    seed: number,
  ): ComputerChoice;
}

const PROGRAM_TEMPLATES: Record<string, string> = {
  right: "Sicurezza, sovranità nazionale, famiglia, ordine e flat tax per le imprese.",
  left: "Welfare, sanità pubblica, diritti, ambiente e riforme progressive per i lavoratori.",
  center: "Riforme liberali, Europa, innovazione e semplificazione per le imprese.",
  populist: "Reddito di cittadinanza, lotta all'establishment, servizi pubblici e democrazia diretta.",
};

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

export class EasyStrategy implements ComputerStrategy {
  choose(_humans: GamePlayer[], _d: GameDifficulty, _o: ComputerOrientation, seed: number): ComputerChoice {
    const rng = createRng(seed);
    const topParties = ["fratelli-ditalia", "partito-democratico", "movimento-5-stelle", "lega", "forza-italia"];
    const partySlug = pick(topParties, rng);
    const pool = ITALIAN_CANDIDATE_POOL.filter((e) => e.partySlug === partySlug);
    const entry = pool.length ? pick(pool, rng) : pick(ITALIAN_CANDIDATE_POOL, rng);
    return toChoice(entry, partySlug, "Programma generico per il cambiamento.");
  }
}

export class MediumStrategy implements ComputerStrategy {
  choose(_humans: GamePlayer[], _d: GameDifficulty, orientation: ComputerOrientation, seed: number): ComputerChoice {
    const polls = getGamePollShares();
    const pool = getPoolByOrientation(orientation === "random" ? "random" : orientation);
    const ranked = [...pool].sort((a, b) => (polls[b.partySlug] ?? 0) - (polls[a.partySlug] ?? 0));
    const entry = ranked[0] ?? ITALIAN_CANDIDATE_POOL[0]!;
    const orient = orientation === "random" ? (entry.ideology >= 0.3 ? "right" : entry.ideology <= -0.2 ? "left" : "center") : orientation;
    const program = PROGRAM_TEMPLATES[orient] ?? PROGRAM_TEMPLATES.center;
    const vp = VP_POOL.find((v) => v.partySlug === entry.partySlug);
    return {
      ...toChoice(entry, entry.partySlug, program),
      vicePresident: vp?.candidate,
    };
  }
}

export class HardStrategy implements ComputerStrategy {
  choose(humans: GamePlayer[], _d: GameDifficulty, orientation: ComputerOrientation, seed: number): ComputerChoice {
    const rng = createRng(seed + 99);
    const pool = getPoolByOrientation(orientation === "random" ? "right" : orientation);
    const humanParty = humans[0]?.party.slug;
    const scored = pool.map((e) => ({
      e,
      score: e.popularity * 0.6 + (humanParty && e.partySlug !== humanParty ? 0.25 : 0) + rng() * 0.15,
    }));
    scored.sort((a, b) => b.score - a.score);
    const entry = scored[0]!.e;
    const vp = VP_POOL.filter((v) => v.partySlug === entry.partySlug).sort((a, b) => b.popularity - a.popularity)[0];
    return {
      ...toChoice(entry, entry.partySlug, PROGRAM_TEMPLATES.right),
      vicePresident: vp?.candidate,
    };
  }
}

export class ImpossibleStrategy implements ComputerStrategy {
  choose(humans: GamePlayer[], _d: GameDifficulty, orientation: ComputerOrientation, seed: number): ComputerChoice {
    const human = humans[0];
    const humanIdeo = human?.party.ideologyScore ?? 0;
    const counterOrientation = humanIdeo < -0.1 ? "right" : humanIdeo > 0.2 ? "left" : "right";
    const pool = getPoolByOrientation(orientation === "random" ? counterOrientation : orientation);
    const entry = pool.sort((a, b) => b.popularity - a.popularity)[0]!;
    const vp = VP_POOL.sort((a, b) => b.popularity - a.popularity)[0];
    const program =
      counterOrientation === "right"
        ? "Sicurezza, ordine, sovranità, taglio tasse e patriottismo economico."
        : "Diritti, Europa, welfare, ambiente e riforme sociali.";
    return {
      displayName: "Computer",
      party: partyFromSlug(entry.partySlug),
      candidate: entry.candidate,
      vicePresident: vp?.candidate,
      description: entry.description,
      program: `${program} Strategia mirata a contrastare ${human?.candidate.firstName ?? "l'avversario"}.`,
    };
  }
}

function toChoice(entry: PoolEntry, partySlug: string, program: string): ComputerChoice {
  return {
    displayName: "Computer",
    party: partyFromSlug(partySlug),
    candidate: entry.candidate,
    description: entry.description,
    program,
  };
}

export function getComputerStrategy(difficulty: GameDifficulty): ComputerStrategy {
  switch (difficulty) {
    case "easy":
      return new EasyStrategy();
    case "medium":
      return new MediumStrategy();
    case "hard":
      return new HardStrategy();
    case "impossible":
      return new ImpossibleStrategy();
    default:
      return new MediumStrategy();
  }
}

export function computerChoiceToPlayer(choice: ComputerChoice, id = "cpu-1"): GamePlayer {
  return {
    id,
    displayName: choice.displayName,
    party: choice.party,
    candidate: choice.candidate,
    vicePresident: choice.vicePresident,
    isComputer: true,
    isHuman: false,
  };
}
