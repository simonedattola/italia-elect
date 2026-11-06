import { z } from "zod";
import { interpretScenarioText, scenarioFromInterpretation } from "@/lib/scenarios/interpret";

export const runtime = "nodejs";

const body = z.object({
  text: z.string().max(600),
  intensity: z.number().min(0).max(1).optional(),
  duration: z.enum(["breve", "media", "lunga"]).optional(),
  scope: z.enum(["nazionale", "regionale", "comunale"]).optional(),
  territory: z.string().max(80).optional(),
  title: z.string().max(80).optional(),
});

export async function POST(request: Request) {
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Testo non valido" }, { status: 400 });
  const interpretation = await interpretScenarioText(parsed.data.text);
  return Response.json({
    interpretation,
    scenario: scenarioFromInterpretation(interpretation, parsed.data),
  });
}
