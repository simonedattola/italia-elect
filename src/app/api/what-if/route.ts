import { NextResponse } from "next/server";
import { interpretWhatIf } from "@/lib/experiences/whatIfParser";
import { generateAgentSample } from "@/lib/agents";
import { runNationalVoting } from "@/lib/simulation/votingEngine";
import { computeDynamicBaseline } from "@/lib/electoral/dynamicBaseline";
import { normalizePartyShares } from "@/lib/electoral/normalizeShares";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const hypothesis = String(body.hypothesis ?? "").trim();
    if (!hypothesis) {
      return NextResponse.json({ ok: false, error: "Ipotesi richiesta" }, { status: 400 });
    }

    const interpretation = interpretWhatIf(hypothesis);
    const baseline = computeDynamicBaseline();
    const agents = generateAgentSample(3000, 77);

    const before = runNationalVoting(agents, { seed: 77 });
    const adjustedBaseline = { ...baseline };
    for (const [party, delta] of Object.entries(interpretation.voteAdjustments)) {
      adjustedBaseline[party] = Math.max(0.1, (adjustedBaseline[party] ?? 0) + delta);
    }
    const normalizedBaseline = normalizePartyShares(adjustedBaseline);

    const after = runNationalVoting(agents, {
      seed: 77,
      baselineOverride: normalizedBaseline,
    });

    return NextResponse.json({
      ok: true,
      interpretation,
      before: before.votingIntent,
      after: after.votingIntent,
      deltas: Object.fromEntries(
        Object.keys({ ...before.votingIntent, ...after.votingIntent }).map((k) => [
          k,
          (after.votingIntent[k] ?? 0) - (before.votingIntent[k] ?? 0),
        ]),
      ),
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
