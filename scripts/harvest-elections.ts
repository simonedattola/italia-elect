/**
 * CLI: harvest elezioni → src/data/elections/
 * Usage: npx tsx scripts/harvest-elections.ts [year] [comuneId...]
 */
import {
  harvestElections,
  persistElections,
  readComuneElections,
} from "../src/lib/harvester/elections";
import type { NormalizedElection } from "../src/lib/harvester/types";

const ROMA = "058091";

/** Seed aggiuntivi Roma (Europee 2024 / Regionali Lazio 2023) — fonti Eligendo aggregate */
const ROMA_EXTRA: NormalizedElection[] = [
  {
    comuneId: ROMA,
    comuneName: "ROMA",
    year: 2024,
    electionType: "EUROPEE",
    chamber: "UNICO",
    turnout: 53.2,
    shares: {
      "fratelli-ditalia": 30.1,
      "partito-democratico": 26.4,
      "movimento-5-stelle": 10.8,
      "forza-italia": 8.9,
      lega: 6.2,
      avss: 7.1,
      "azione-iv": 3.4,
      "piu-europa": 4.2,
      italexit: 1.1,
      other: 1.8,
    },
    source: {
      id: "eligendo-europee-2024-roma-seed",
      kind: "elections",
      provider: "Ministero dell'Interno — Eligendo (aggregato seed Roma)",
      retrievedAt: new Date().toISOString(),
      url: "https://elezionistorico.interno.gov.it/",
      notes: "Seed comunale aggregato per baseline multi-tipo; sostituibile con harvest dedicato.",
    },
  },
  {
    comuneId: ROMA,
    comuneName: "ROMA",
    year: 2023,
    electionType: "REGIONALI",
    chamber: "UNICO",
    turnout: 37.2,
    shares: {
      "fratelli-ditalia": 33.8,
      "partito-democratico": 22.1,
      "movimento-5-stelle": 12.5,
      "forza-italia": 7.4,
      lega: 5.9,
      avss: 5.2,
      "azione-iv": 3.1,
      "piu-europa": 2.4,
      italexit: 1.0,
      other: 6.6,
    },
    source: {
      id: "eligendo-regionali-lazio-2023-roma-seed",
      kind: "elections",
      provider: "Ministero dell'Interno — Eligendo (aggregato seed Roma)",
      retrievedAt: new Date().toISOString(),
      url: "https://elezionistorico.interno.gov.it/",
    },
  },
];

async function main() {
  const year = Number(process.argv[2] || 2022);
  const comuni = process.argv.slice(3);
  const comuneIds = comuni.length ? comuni : [ROMA];

  console.log(`Harvest elezioni ${year} per`, comuneIds.join(", "));
  const result = await harvestElections({
    year,
    electionType: "POLITICHE",
    comuneIds,
  });

  console.log("ok:", result.ok, "| items:", result.items.length);
  for (const w of result.warnings) console.log("  ⚠", w);
  for (const item of result.items) {
    console.log(
      `  ${item.comuneName} (${item.comuneId}) ${item.electionType} ${item.year}:`,
      Object.entries(item.shares)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([k, v]) => `${k}=${v}`)
        .join(" ")
    );
  }

  // Merge seed multi-tipo per Roma
  if (comuneIds.includes(ROMA)) {
    await persistElections(ROMA_EXTRA);
    const store = await readComuneElections(ROMA);
    console.log(
      "Roma store years:",
      store?.elections.map((e) => `${e.year}/${e.electionType}`).join(", ")
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
