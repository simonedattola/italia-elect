/**
 * Test Fase 1 — harvester + baseline Roma 2022.
 */
import { harvestElections, readComuneElections } from "../src/lib/harvester/elections";
import { getBaseline, getBaselinesByType, getElectionRecord } from "../src/lib/harvester/baseline";
import { normalizeAll } from "../src/lib/harvester/normalizer";
import { loadPolls } from "../src/lib/harvester/polls";
import { readBes } from "../src/lib/harvester/istat";
import { mapListaToSlug } from "../src/lib/harvester/partyMap";

const ROMA = "058091";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log("✓", msg);
}

async function main() {
  console.log("\n=== Test harvester / baseline (Roma 2022) ===\n");

  // Assicura dati: harvest (o seed già presente)
  const harvested = await harvestElections({
    year: 2022,
    electionType: "POLITICHE",
    comuneIds: [ROMA],
  });
  assert(harvested.ok, "Harvest Politiche 2022 Roma ok");
  assert(harvested.items.length >= 1, `Almeno 1 record elettorale (${harvested.items.length})`);
  for (const w of harvested.warnings) console.log("  ℹ", w);

  const store = await readComuneElections(ROMA);
  assert(!!store, "Store comunale Roma presente su disco");
  assert(store!.comuneId === ROMA, "comuneId = 058091");
  assert(
    store!.elections.some((e) => e.year === 2022 && e.electionType === "POLITICHE"),
    "Politiche 2022 presenti nello store"
  );

  const rec = await getElectionRecord(ROMA, 2022, "POLITICHE");
  assert(!!rec, "getElectionRecord Politiche 2022");
  assert(rec!.comuneName.toUpperCase().includes("ROMA"), "Nome comune Roma");
  assert(
    (rec!.shares["fratelli-ditalia"] ?? 0) > 20,
    `FdI Roma 2022 > 20% (got ${rec!.shares["fratelli-ditalia"]})`
  );
  assert(
    (rec!.shares["partito-democratico"] ?? 0) > 15,
    `PD Roma 2022 > 15% (got ${rec!.shares["partito-democratico"]})`
  );
  assert(
    (rec!.shares["movimento-5-stelle"] ?? 0) > 8,
    `M5S Roma 2022 > 8% (got ${rec!.shares["movimento-5-stelle"]})`
  );

  const baseline = await getBaseline(ROMA, 2022);
  assert(Object.keys(baseline).length >= 5, `getBaseline ha >=5 partiti (${Object.keys(baseline).length})`);
  const sum = Object.values(baseline).reduce((a, b) => a + b, 0);
  assert(sum > 95 && sum < 105, `Baseline somma ~100 (got ${sum.toFixed(1)})`);
  console.log(
    "  baseline top:",
    Object.entries(baseline)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k, v]) => `${k}=${v}`)
      .join(" ")
  );

  // Party map
  assert(
    mapListaToSlug("FRATELLI D'ITALIA CON GIORGIA MELONI") === "fratelli-ditalia",
    "mapLista FdI"
  );
  assert(
    mapListaToSlug("PARTITO DEMOCRATICO - ITALIA DEMOCRATICA E PROGRESSISTA") ===
      "partito-democratico",
    "mapLista PD"
  );

  // Normalizer
  const normalized = normalizeAll({ elections: [rec!] });
  assert(normalized.length === 1 && normalized[0].kind === "election", "normalizeAll election");

  // Polls
  const polls = await loadPolls();
  assert(polls.length >= 5, `polls.json ha >=5 sondaggi (${polls.length})`);
  assert(
    polls.every((p) => p.institute && p.sampleSize > 0 && Object.keys(p.shares).length > 0),
    "Ogni sondaggio ha istituto, campione, shares"
  );

  // ISTAT BES seed/harvesed
  const bes = await readBes(ROMA);
  assert(bes.length >= 1, `BES Roma/proxy presente (${bes.length} indicatori)`);

  // Multi-type optional (se seed europee/regionali già mergeati)
  const byType = await getBaselinesByType(ROMA, 2022);
  assert(!!byType.POLITICHE, "getBaselinesByType include POLITICHE 2022");

  console.log("\n✓ test:harvester OK\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
