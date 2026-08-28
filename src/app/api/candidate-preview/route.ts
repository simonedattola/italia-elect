import { NextResponse } from "next/server";
import { z } from "zod";
import { getParty } from "@/lib/electoral/parties";
import { refreshParties } from "@/lib/electoral/partyRegistryServer";
import {
  buildSimulationPreview,
  candidateInputFromForm,
} from "@/lib/simulation/buildSimulationPreview";
import { resolveCandidateForSimulation } from "@/lib/simulation/resolveCandidate";
import { DEFAULT_UI_SCENARIO } from "@/types/scenario";

const bodySchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  partySlug: z.string(),
  description: z.string().min(1).max(5000),
  program: z.string().max(10000).optional(),
  scenario: z
    .object({
      uiMode: z.enum(["analyst", "fun"]).optional(),
      chaosMode: z.boolean().optional(),
      partyVoteAdjustments: z.record(z.string(), z.number()).optional(),
      activeCoalitions: z.record(z.string(), z.boolean()).optional(),
      partyThreshold: z.number().optional(),
      turnout: z.number().optional(),
      useRosatellum: z.boolean().optional(),
    })
    .optional(),
});

export async function POST(req: Request) {
  try {
    await refreshParties();
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi" },
        { status: 400 },
      );
    }

    const data = parsed.data;
    if (!getParty(data.partySlug)) {
      return NextResponse.json({ ok: false, error: "Partito non valido" }, { status: 400 });
    }

    const description =
      data.description.trim().length >= 20
        ? data.description.trim()
        : data.description.trim() || "Politico italiano.";

    const resolved = await resolveCandidateForSimulation({
      firstName: data.firstName,
      lastName: data.lastName,
      partySlug: data.partySlug,
      description,
      program: data.program,
    });

    const scenario = {
      ...DEFAULT_UI_SCENARIO,
      ...(data.scenario ?? {}),
      partyVoteAdjustments: {
        ...DEFAULT_UI_SCENARIO.partyVoteAdjustments,
        ...(data.scenario?.partyVoteAdjustments ?? {}),
      },
      activeCoalitions: {
        ...DEFAULT_UI_SCENARIO.activeCoalitions,
        ...(data.scenario?.activeCoalitions ?? {}),
      },
    };
    if (scenario.uiMode === "fun") scenario.chaosMode = true;

    const preview = buildSimulationPreview({
      candidate: candidateInputFromForm({
        firstName: data.firstName,
        lastName: data.lastName,
        partySlug: data.partySlug,
        description,
        program: data.program,
      }),
      scenario,
      recognition: resolved.recognitionForEngine,
      publicFigure: resolved.publicFigureForEngine,
    });

    return NextResponse.json({ ok: true, ...preview });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Preview failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/** Legacy GET — reindirizza alla logica POST minima */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  return POST(
    new Request(req.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: searchParams.get("firstName") ?? "",
        lastName: searchParams.get("lastName") ?? "",
        partySlug: searchParams.get("partySlug") ?? "",
        description: searchParams.get("description") ?? "Politico italiano.",
        program: searchParams.get("program") ?? "",
      }),
    }),
  );
}
