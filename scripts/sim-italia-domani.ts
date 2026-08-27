import "dotenv/config";
import { ITALIA_DEL_DOMANI } from "../src/lib/electoral/sample-programs";
import { createSimulation, getSimulationBySlug } from "../src/actions/simulate";
import { createComparison } from "../src/actions/compare";

const parties = ["azione-iv", "partito-democratico", "fratelli-ditalia", "piu-europa"];

async function main() {
  const slugs: string[] = [];
  for (const partySlug of parties) {
    const res = await createSimulation({
      firstName: "Alessandra",
      lastName: "Conti",
      partySlug,
      description: ITALIA_DEL_DOMANI.descriptionTemplate,
      program: ITALIA_DEL_DOMANI.program,
    });
    console.log(partySlug, res);
    if (res.ok) {
      slugs.push(res.slug);
      const sim = await getSimulationBySlug(res.slug);
      const leader = sim?.nationalResults.find((r) => r.partySlug === partySlug);
      console.log(
        " ->",
        leader?.percentage + "%",
        "win",
        sim?.winProbability,
        "compat",
        sim?.candidate.profile?.partyCompatibility,
        "candEff",
        sim?.influenceFactors?.find((f) => f.id === "candidate")?.effectPts
      );
    }
  }
  if (slugs.length >= 2) {
    const cmp = await createComparison(slugs);
    console.log("confronto:", cmp);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
