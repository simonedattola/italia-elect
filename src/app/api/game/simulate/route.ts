import { NextResponse } from "next/server";
import { z } from "zod";
import { gameSimulationEngine } from "@/lib/game/GameSimulationEngine";
import {
  computerChoiceToPlayer,
  getComputerStrategy,
} from "@/lib/game/computer/ComputerStrategy";
import type { GameMode, GamePlayer } from "@/lib/game/types";

const playerSchema = z.object({
  id: z.string(),
  displayName: z.string().min(1),
  party: z.object({
    slug: z.string(),
    name: z.string(),
    color: z.string(),
    isCustom: z.boolean().optional(),
    ideologyScore: z.number().optional(),
    customProfile: z
      .object({
        motto: z.string(),
        economicAxis: z.number(),
        socialAxis: z.number(),
        themeAnswers: z.record(
          z.string(),
          z.union([z.string(), z.number(), z.boolean()]),
        ),
      })
      .optional(),
  }),
  candidate: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    description: z.string().optional(),
    program: z.string().optional(),
  }),
  vicePresident: z
    .object({
      firstName: z.string(),
      lastName: z.string(),
      description: z.string().optional(),
      program: z.string().optional(),
    })
    .optional(),
  isComputer: z.boolean().optional(),
});

const bodySchema = z
  .object({
    mode: z.enum(["multiplayer", "singleplayer", "vscomputer", "computervscomputer"]),
    players: z.array(playerSchema).max(8),
    redistributionMode: z.enum(["candidates_only", "all_parties"]).optional(),
    realPartySlugs: z.array(z.string()).optional(),
    difficulty: z.enum(["easy", "medium", "hard", "impossible"]).optional(),
    computerOrientation: z
      .enum(["random", "right", "left", "center", "populist"])
      .optional(),
    scenario: z
      .object({
        id: z.string(),
        kind: z.enum(["current", "custom", "random"]),
        title: z.string(),
        description: z.string(),
        narrative: z.string(),
        customText: z.string().optional(),
        partyModifiers: z.array(
          z.object({ slug: z.string(), delta: z.number() }),
        ),
      })
      .optional(),
    seed: z.number().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.mode === "computervscomputer") return;
    if (data.players.length < 1) {
      ctx.addIssue({ code: "custom", message: "Almeno un giocatore", path: ["players"] });
    }
    if (data.mode === "multiplayer" && data.players.length < 2) {
      ctx.addIssue({
        code: "custom",
        message: "Multiplayer richiede almeno 2 giocatori",
        path: ["players"],
      });
    }
    if (data.mode === "multiplayer" && data.players.length > 8) {
      ctx.addIssue({
        code: "custom",
        message: "Massimo 8 giocatori",
        path: ["players"],
      });
    }
  });

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi" },
        { status: 400 },
      );
    }

    const data = parsed.data;
    let players: GamePlayer[] = data.players as GamePlayer[];
    const mode = data.mode as GameMode;
    const seed = data.seed ?? Math.floor(Math.random() * 1e9);

    if (mode === "vscomputer" && players.length === 1) {
      const strategy = getComputerStrategy(data.difficulty ?? "medium");
      const choice = strategy.choose(
        players,
        data.difficulty ?? "medium",
        data.computerOrientation ?? "random",
        seed,
      );
      players = [...players, computerChoiceToPlayer(choice, "cpu-1")];
    }

    if (mode === "computervscomputer") {
      const s1 = getComputerStrategy("medium");
      const s2 = getComputerStrategy("hard");
      const c1 = s1.choose([], "medium", "right", seed);
      const c2 = s2.choose([], "hard", "left", seed + 1);
      players = [
        computerChoiceToPlayer(c1, "cpu-a"),
        computerChoiceToPlayer(c2, "cpu-b"),
      ];
    }

    const result = await gameSimulationEngine.simulate(players, {
      mode,
      redistributionMode: data.redistributionMode ?? "candidates_only",
      realPartySlugs: data.realPartySlugs,
      difficulty: data.difficulty,
      computerOrientation: data.computerOrientation,
      scenario: data.scenario,
      seed,
    });

    return NextResponse.json({ ok: true, result, players });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Simulazione fallita" },
      { status: 500 },
    );
  }
}
