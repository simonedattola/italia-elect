import { z } from "zod";
import { assessLeaderWithFallback } from "@/lib/figures/assess";

export const runtime = "nodejs";

const body = z.object({
  name: z.string().min(2).max(80),
  partyId: z.string().min(1).max(80),
  ideology: z.number().min(-1).max(1).default(0),
});

export async function POST(request: Request) {
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Nome non valido" }, { status: 400 });
  const assessment = await assessLeaderWithFallback(parsed.data.name, parsed.data.partyId, parsed.data.ideology);
  return Response.json(assessment);
}
