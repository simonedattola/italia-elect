import "dotenv/config";
import { createSimulation, getSimulationBySlug, listSimulations } from "../src/actions/simulate";

async function main() {
  const res = await createSimulation({
    firstName: "Giorgia",
    lastName: "Meloni",
    partySlug: "fratelli-ditalia",
    description: "Presidente del Consiglio, leader di Fratelli d'Italia, posizione conservatrice e sovranista.",
    program: "Sicurezza, famiglie, industria, sovranità nazionale.",
  });
  console.log("create:", res);
  if (!res.ok) process.exit(1);
  const sim = await getSimulationBySlug(res.slug);
  console.log("leader %:", sim?.nationalResults[0]);
  console.log("winP:", sim?.winProbability);
  console.log("provinces:", sim?.provincialMap.length);
  console.log("analysis length:", sim?.analysis?.length);
  const list = await listSimulations(5);
  console.log("dashboard rows:", list.length);
}
main().catch((e) => { console.error(e); process.exit(1); });
