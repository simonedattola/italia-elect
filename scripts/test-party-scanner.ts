import { CORE_PARTIES } from "@/lib/electoral/coreParties";
import { getParty } from "@/lib/electoral/parties";
import { scanPartiesFromSources } from "@/lib/intelligence/party-scanner";

const fnInCore = CORE_PARTIES.some((p) => p.slug === "futuro-nazionale");
if (!fnInCore) {
  console.error("FAIL: Futuro Nazionale non in CORE_PARTIES");
  process.exit(1);
}

const party = getParty("futuro-nazionale");
if (!party || party.aiDetected) {
  console.error("FAIL: FN non disponibile come partito core");
  process.exit(1);
}

const existing = new Set(CORE_PARTIES.map((p) => p.slug));
const scan = scanPartiesFromSources(existing);
const rediscovered = scan.discovered.find((p) => p.slug === "futuro-nazionale");
if (rediscovered) {
  console.error("FAIL: FN ri-scoperto come emergente");
  process.exit(1);
}

console.log("OK party-scanner: FN core, emergenti:", scan.discovered.map((p) => p.slug).join(", ") || "none");
