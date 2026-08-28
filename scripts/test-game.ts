/**
 * Test suite Italia Elect Game.
 * Run: npm run test:game
 */
import { candidateRecognizer } from "../src/lib/game/CandidateRecognizer";
import { programAnalyzer } from "../src/lib/game/ProgramAnalyzer";
import { voterRedistribution } from "../src/lib/game/VoterRedistribution";
import { gameSimulationEngine } from "../src/lib/game/GameSimulationEngine";
import { getPartyOrThrow } from "../src/lib/electoral/parties";
import { getGameBaseline } from "../src/lib/game/gameBaseline";
import { getComputerStrategy } from "../src/lib/game/computer/ComputerStrategy";
import type { GamePlayer } from "../src/lib/game/types";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log("✓", msg);
}

async function testElonMuskAvs() {
  const profile = await candidateRecognizer.recognize(
    {
      firstName: "Elon",
      lastName: "Musk",
      description: "Imprenditore tech, CEO di Tesla e SpaceX.",
    },
    { slug: "avss", name: "AVS", color: "#009246", ideologyScore: -0.65 },
    "Crescita economica liberista, taglio tasse, deregulation.",
  );
  console.log(
    `  Elon Musk/AVS → pop ${profile.popularity}, compat ${profile.compatibility}, pos ${profile.positionLabel}`,
  );
  assert(profile.isPublicFigure, "Elon Musk riconosciuto come figura pubblica");
  assert(profile.popularity >= 50, `Popolarità alta (got ${profile.popularity})`);
  assert(
    profile.compatibility <= 25,
    `Compatibilità AVS bassissima (got ${profile.compatibility})`,
  );
}

async function testLeftProgram() {
  const prog = programAnalyzer.analyze(
    "Welfare universale, diritti civili, transizione ecologica, sanità pubblica, Europa sociale e tutele per i lavoratori.",
    getPartyOrThrow("partito-democratico"),
  );
  console.log(`  Programma sinistra → ideologia ${prog.ideology.toFixed(2)}, temi: ${prog.themes.join(", ")}`);
  assert(prog.ideology < -0.1, `Posizionamento sinistra (got ${prog.ideology})`);
  assert(
    prog.themes.some((t) => /Diritti|Ambiente|Sanità|Europa/i.test(t)),
    "Temi progressivi rilevati",
  );
}

function testRedistributionWithoutFdi() {
  const baseline = getGameBaseline();
  const present = new Set(["lega", "futuro-nazionale", "partito-democratico", "movimento-5-stelle"]);
  const redistributed = voterRedistribution.redistribute(baseline, present);
  const fdiBefore = baseline["fratelli-ditalia"] ?? 0;
  const legaAfter = redistributed.lega ?? 0;
  const fnAfter = redistributed["futuro-nazionale"] ?? 0;
  const legaBefore = baseline.lega ?? 0;
  const fnBefore = baseline["futuro-nazionale"] ?? 0;

  console.log(
    `  Senza FdI (${fdiBefore.toFixed(1)}%) → Lega ${legaBefore.toFixed(1)}→${legaAfter.toFixed(1)}%, FN ${fnBefore.toFixed(1)}→${fnAfter.toFixed(1)}%`,
  );
  assert(redistributed["fratelli-ditalia"] === 0 || redistributed["fratelli-ditalia"]! < 0.1, "FdI assente");
  assert(
    legaAfter > legaBefore || fnAfter > fnBefore,
    "Voti FdI ridistribuiti verso Lega o Futuro Nazionale",
  );
}

async function testMeloniVsSchlein() {
  const players: GamePlayer[] = [
    {
      id: "p1",
      displayName: "Giocatore 1",
      party: { slug: "fratelli-ditalia", name: "FdI", color: "#0A2F6B" },
      candidate: {
        firstName: "Giorgia",
        lastName: "Meloni",
        description: "Presidente del Consiglio, leader di Fratelli d'Italia.",
      },
      isHuman: true,
    },
    {
      id: "p2",
      displayName: "Giocatore 2",
      party: { slug: "partito-democratico", name: "PD", color: "#E4002B" },
      candidate: {
        firstName: "Elly",
        lastName: "Schlein",
        description: "Segretaria del Partito Democratico.",
      },
      isHuman: true,
    },
  ];

  const result = await gameSimulationEngine.simulate(players, {
    mode: "multiplayer",
    redistributionMode: "candidates_only",
    seed: 12345,
  });

  const meloni = result.players.find((p) => p.partySlug === "fratelli-ditalia")!;
  const schlein = result.players.find((p) => p.partySlug === "partito-democratico")!;
  console.log(
    `  Meloni ${meloni.percentage}% (${meloni.totalSeats} seggi) vs Schlein ${schlein.percentage}% (${schlein.totalSeats} seggi)`,
  );
  assert(meloni.percentage > 15, `Meloni/FdI risultato realistico (got ${meloni.percentage}%)`);
  assert(schlein.percentage > 10, `Schlein/PD risultato realistico (got ${schlein.percentage}%)`);
  assert(
    meloni.profile.compatibility > schlein.profile.compatibility - 20,
    "Meloni compatibilità FdI coerente",
  );
}

async function testRegionalMap() {
  const players: GamePlayer[] = [
    {
      id: "p1",
      displayName: "Test",
      party: { slug: "fratelli-ditalia", name: "FdI", color: "#0A2F6B" },
      candidate: { firstName: "Giorgia", lastName: "Meloni" },
      isHuman: true,
    },
    {
      id: "p2",
      displayName: "Test 2",
      party: { slug: "partito-democratico", name: "PD", color: "#E4002B" },
      candidate: { firstName: "Elly", lastName: "Schlein" },
      isHuman: true,
    },
  ];
  const result = await gameSimulationEngine.simulate(players, {
    mode: "multiplayer",
    redistributionMode: "candidates_only",
    seed: 99,
  });
  assert(result.regionalResults.length >= 10, `Mappa regionale popolata (${result.regionalResults.length} regioni)`);
  assert(result.provincialMap.length > 50, `Mappa provinciale popolata (${result.provincialMap.length})`);
}

async function testSinglePlayer() {
  const human: GamePlayer = {
    id: "human",
    displayName: "Tu",
    party: { slug: "fratelli-ditalia", name: "FdI", color: "#0A2F6B" },
    candidate: {
      firstName: "Giorgia",
      lastName: "Meloni",
      description: "Leader nazionale di destra.",
    },
    isHuman: true,
  };
  const result = await gameSimulationEngine.simulate([human], {
    mode: "singleplayer",
    redistributionMode: "candidates_only",
    realPartySlugs: ["partito-democratico", "movimento-5-stelle", "lega"],
    seed: 777,
  });
  assert(result.players.length >= 3, `Single player con partiti AI (${result.players.length} candidati)`);
}

async function testComputerHardWinRate() {
  let cpuWins = 0;
  const runs = 20;
  for (let i = 0; i < runs; i++) {
    const human: GamePlayer = {
      id: "human",
      displayName: "Tu",
      party: { slug: "partito-democratico", name: "PD", color: "#E4002B" },
      candidate: {
        firstName: "Mario",
        lastName: "Rossi",
        description: "Candidato locale senza notorietà nazionale.",
      },
      isHuman: true,
    };
    const strategy = getComputerStrategy("hard");
    const choice = strategy.choose([human], "hard", "right", 1000 + i);
    const cpu: GamePlayer = {
      id: "cpu",
      displayName: "Computer",
      party: choice.party,
      candidate: choice.candidate,
      vicePresident: choice.vicePresident,
      isComputer: true,
    };
    const result = await gameSimulationEngine.simulate([human, cpu], {
      mode: "vscomputer",
      redistributionMode: "candidates_only",
      seed: 2000 + i,
    });
    if (result.winner.playerId === "cpu") cpuWins++;
  }
  const rate = cpuWins / runs;
  console.log(`  Computer difficile vince ${cpuWins}/${runs} (${(rate * 100).toFixed(0)}%)`);
  assert(rate >= 0.45, `Computer difficile competitivo (win rate ${(rate * 100).toFixed(0)}%)`);
}

async function main() {
  console.log("\n=== Italia Elect Game — test suite ===\n");

  await testElonMuskAvs();
  await testLeftProgram();
  testRedistributionWithoutFdi();
  await testMeloniVsSchlein();
  await testRegionalMap();
  await testSinglePlayer();
  await testComputerHardWinRate();

  console.log("\n✓ Tutti i test game passati\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
