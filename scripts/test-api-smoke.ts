/**
 * Smoke test modelli predittivi (logica core, senza server-only Next).
 */
import { POST as challengePOST } from "../src/app/api/challenge/route";
import { POST as whatIfPOST } from "../src/app/api/what-if/route";
import { pickRandomScenario } from "../src/lib/experiences/randomScenarios";
import { GET as baselineGET } from "../src/app/api/baseline/route";
import { buildSimulationPreview } from "../src/lib/simulation/buildSimulationPreview";
import { resolveCandidateForSimulation } from "../src/lib/simulation/resolveCandidate";
import { DEFAULT_UI_SCENARIO } from "../src/types/scenario";
import { normalizePartyShares } from "../src/lib/electoral/normalizeShares";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
  console.log("✓", msg);
}

async function json(res: Response) {
  return res.json() as Promise<Record<string, unknown>>;
}

async function main() {
  console.log("\n=== Predictive model smoke tests ===\n");

  const baselineRes = await baselineGET();
  const baseline = await json(baselineRes);
  assert(baselineRes.ok && baseline.ok === true, "baseline builder");
  const shares = baseline.baseline as Record<string, number> | undefined;
  assert(Boolean(shares?.["fratelli-ditalia"]), "baseline includes FdI");

  const scenario = pickRandomScenario(42);
  assert(Object.keys(scenario.voteImpact).length > 0, "random scenario voteImpact");

  const resolved = await resolveCandidateForSimulation({
    firstName: "Mario",
    lastName: "Rossi",
    partySlug: "partito-democratico",
    description:
      "Candidato progressista del centrosinistra, europeista, attento ai temi sociali e del lavoro.",
  });
  const preview = buildSimulationPreview({
    candidate: {
      firstName: "Mario",
      lastName: "Rossi",
      partySlug: "partito-democratico",
      description:
        "Candidato progressista del centrosinistra, europeista, attento ai temi sociali e del lavoro.",
    },
    scenario: DEFAULT_UI_SCENARIO,
    recognition: resolved.recognitionForEngine,
    publicFigure: resolved.publicFigureForEngine,
  });
  assert(preview.partyCompatibility > 40, `simulation preview compat (${preview.partyCompatibility})`);
  assert(preview.projectedLeaderPct > 5, `simulation preview pct (${preview.projectedLeaderPct})`);

  const challengeRes = await challengePOST(
    new Request("http://local/api/challenge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        player1: {
          firstName: "Giorgia",
          lastName: "Meloni",
          partySlug: "fratelli-ditalia",
          description: "Leader sovranista conservatrice.",
        },
        player2: {
          firstName: "Elly",
          lastName: "Schlein",
          partySlug: "partito-democratico",
          description: "Segretaria PD progressista europeista.",
        },
      }),
    }),
  );
  const challenge = await json(challengeRes);
  assert(challengeRes.ok && challenge.ok === true, "challenge agent model");
  assert(Boolean(challenge.winner), "challenge winner");
  const p1 = challenge.player1 as { compatibility: number };
  assert(p1.compatibility > 0.35, `Meloni compat weighted (${p1.compatibility})`);

  const whatIfRes = await whatIfPOST(
    new Request("http://local/api/what-if", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hypothesis: "Crisi economica con inflazione alta e spread in aumento",
      }),
    }),
  );
  const whatIf = await json(whatIfRes);
  assert(whatIfRes.ok && whatIf.ok === true, "what-if agent model");
  const after = whatIf.after as Record<string, number>;
  const sumAfter = Object.values(after).reduce((a, b) => a + b, 0);
  assert(Math.abs(sumAfter - 100) < 2, `what-if normalized (${sumAfter.toFixed(1)}%)`);

  const norm = normalizePartyShares({ a: 30, b: 30, c: 30 });
  assert(Math.abs(Object.values(norm).reduce((a, b) => a + b, 0) - 100) < 0.01, "share normalizer");

  console.log("\n=== Smoke OK ===\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
