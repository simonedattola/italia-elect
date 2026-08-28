import { NextResponse } from "next/server";
import {
  createCustomParty,
  listCustomParties,
  loadCustomPartiesIntoRegistry,
} from "@/lib/electoral/customParties";
import { getPartiesSnapshot } from "@/lib/electoral/partyRegistryCore";
import type { CoalitionFamily } from "@/types/simulation";

export async function GET() {
  await loadCustomPartiesIntoRegistry();
  const custom = await listCustomParties();
  const all = getPartiesSnapshot();
  return NextResponse.json({
    ok: true,
    parties: all.map((p) => ({
      slug: p.slug,
      name: p.name,
      shortName: p.shortName,
      color: p.color,
      ideologyScore: p.ideologyScore,
      coalitionFamily: p.coalitionFamily,
      aiDetected: p.aiDetected ?? false,
      isCustom: custom.some((c) => c.slug === p.slug),
    })),
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    if (name.length < 2) {
      return NextResponse.json({ ok: false, error: "Nome partito richiesto" }, { status: 400 });
    }

    const party = await createCustomParty({
      name,
      color: String(body.color ?? "#2563EB"),
      ideologyScore: Number(body.ideologyScore ?? 0),
      coalitionFamily: (body.coalitionFamily as CoalitionFamily) ?? "ALTRO",
      program: body.program ? String(body.program) : undefined,
      leader: body.leader ? String(body.leader) : undefined,
    });

    return NextResponse.json({ ok: true, party });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 400 },
    );
  }
}
