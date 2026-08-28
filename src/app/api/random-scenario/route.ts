import { NextResponse } from "next/server";
import { pickRandomScenario, RANDOM_SCENARIOS } from "@/lib/experiences/randomScenarios";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const seed = searchParams.get("seed");
  const scenario = pickRandomScenario(seed ? Number(seed) : undefined);
  return NextResponse.json({ ok: true, scenario, total: RANDOM_SCENARIOS.length });
}
