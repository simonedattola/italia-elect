import { NextResponse } from "next/server";
import { candidateRecognizer } from "@/lib/game/CandidateRecognizer";
import { getComputerStrategy, computerChoiceToPlayer } from "@/lib/game/computer/ComputerStrategy";
import { z } from "zod";

const candidatePreviewSchema = z.object({
  candidate: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    description: z.string().optional(),
    program: z.string().optional(),
  }),
  party: z.object({
    slug: z.string(),
    name: z.string(),
    color: z.string(),
    isCustom: z.boolean().optional(),
    ideologyScore: z.number().optional(),
  }),
});

const bodySchema = z.object({
  difficulty: z.enum(["easy", "medium", "hard", "impossible"]).optional(),
  orientation: z.enum(["random", "right", "left", "center", "populist"]).optional(),
  seed: z.number().optional(),
  humanPlayer: z
    .object({
      party: z.object({ slug: z.string(), ideologyScore: z.number().optional() }),
      candidate: z.object({ firstName: z.string(), lastName: z.string() }),
    })
    .optional(),
  candidate: candidatePreviewSchema.shape.candidate.optional(),
  party: candidatePreviewSchema.shape.party.optional(),
  vicePresident: z
    .object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      description: z.string().optional(),
      program: z.string().optional(),
    })
    .optional(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Dati non validi" }, { status: 400 });
    }

    const data = parsed.data;

    if (data.candidate && data.party) {
      const profile = await candidateRecognizer.recognize(
        data.candidate,
        data.party,
        data.candidate.program,
        data.vicePresident,
      );
      return NextResponse.json({ ok: true, profile });
    }

    const { difficulty = "medium", orientation = "random", seed = 42, humanPlayer } = data;
    const strategy = getComputerStrategy(difficulty);
    const humans = humanPlayer
      ? [
          {
            id: "human",
            displayName: "Tu",
            party: {
              slug: humanPlayer.party.slug,
              name: humanPlayer.party.slug,
              color: "#2563EB",
              ideologyScore: humanPlayer.party.ideologyScore,
            },
            candidate: humanPlayer.candidate,
            isHuman: true,
          },
        ]
      : [];
    const choice = strategy.choose(humans, difficulty, orientation, seed);
    const player = computerChoiceToPlayer(choice);
    return NextResponse.json({ ok: true, choice, player });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

/** Preview profilo candidato (GET legacy) */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const firstName = searchParams.get("firstName") ?? "";
  const lastName = searchParams.get("lastName") ?? "";
  const partySlug = searchParams.get("partySlug") ?? "partito-democratico";
  const partyName = searchParams.get("partyName") ?? partySlug;
  const color = searchParams.get("color") ?? "#2563EB";
  const description = searchParams.get("description") ?? "";
  const ideologyScore = Number(searchParams.get("ideologyScore") ?? "0");

  if (!firstName || !lastName) {
    return NextResponse.json({ ok: false, error: "Nome richiesto" }, { status: 400 });
  }

  const profile = await candidateRecognizer.recognize(
    { firstName, lastName, description },
    {
      slug: partySlug,
      name: partyName,
      color,
      ideologyScore: Number.isFinite(ideologyScore) ? ideologyScore : 0,
    },
    searchParams.get("program") ?? undefined,
  );

  return NextResponse.json({ ok: true, profile });
}
