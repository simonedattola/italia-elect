import { z } from "zod";
import { simulateContest } from "@/lib/game/contest";

export const runtime = "nodejs";

const player = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1).max(40),
  partyId: z.string().min(1).max(80),
  partyName: z.string().min(1).max(80),
  color: z.string().max(20),
  ideology: z.number().min(-1).max(1),
  candidateName: z.string().min(1).max(80),
  custom: z.boolean().optional(),
});

const scenario = z.object({
  id: z.string(),
  title: z.string(),
  intensity: z.number(),
  duration: z.enum(["breve", "media", "lunga"]),
  scope: z.enum(["nazionale", "regionale", "comunale"]),
  territory: z.string().optional(),
  themes: z.record(z.string(), z.number()),
  affectedPartyIds: z.array(z.string()).optional(),
  origin: z.enum(["preset", "custom", "drawn", "text"]).optional(),
});

const body = z.object({
  level: z.enum(["nazionali", "regionali", "comunali"]),
  territory: z.string().optional(),
  seed: z.number().optional(),
  label: z.string().optional(),
  scenarios: z.array(scenario).max(8).optional(),
  players: z.array(player).min(1).max(2),
});

export async function POST(request: Request) {
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Richiesta non valida" }, { status: 400 });
  const result = await simulateContest(parsed.data);
  return Response.json(result);
}
