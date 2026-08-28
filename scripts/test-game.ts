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

async function testProgressiveTextShiftsPd() {
  const progressive =
    "Una società più giusta e democratica, aperta all'Europa, attenta ai diritti civili, al clima e alle nuove generazioni.";
  const profile = await candidateRecognizer.recognize(
    {
      firstName: "Mario",
      lastName: "Rossi",
      description: "Giovane attivista progressista.",
      program: progressive,
    },
    { slug: "partito-democratico", name: "PD", color: "#E4002B", ideologyScore: -0.35 },
    progressive,
  );
  console.log(
    `  Rossi/PD progressista → compat ${profile.compatibility}, swing ${profile.textSwingPts}, ideo ${profile.ideology.toFixed(2)}`,
  );
  assert(profile.ideology < -0.05, `Ideologia progressista (got ${profile.ideology})`);
  assert((profile.textSwingPts ?? 0) > 0, `Testo coerente dà boost (got ${profile.textSwingPts})`);
  assert(profile.themes!.length >= 2, "Almeno 2 temi rilevati");
}

async function testRightTextOnPdPenalty() {
  const profile = await candidateRecognizer.recognize(
    {
      firstName: "Luigi",
      lastName: "Bianchi",
      description: "Leader sovranista e conservatore.",
      program:
        "Stop immigrazione, ordine e sicurezza, patriottismo economico, famiglia tradizionale, flat tax.",
    },
    { slug: "partito-democratico", name: "PD", color: "#E4002B", ideologyScore: -0.35 },
  );
  console.log(`  Bianchi/PD destra → compat ${profile.compatibility}, swing ${profile.textSwingPts}`);
  assert(
    profile.compatibility < 25 || (profile.textSwingPts ?? 0) < -0.5,
    `Testo di destra su PD penalizza (compat ${profile.compatibility}, swing ${profile.textSwingPts})`,
  );
}

async function testCustomPartyWorks() {
  const profile = await candidateRecognizer.recognize(
    {
      firstName: "Anna",
      lastName: "Verdi",
      description: "Ambientalista e pacifista.",
      program: "Transizione ecologica, diritti, Europa sociale, sanità pubblica.",
    },
    {
      slug: "custom-test",
      name: "Verdi Futuro",
      color: "#009246",
      ideologyScore: -0.7,
      isCustom: true,
    },
  );
  assert(profile.compatibility > 40, `Custom party + testo coerente (got ${profile.compatibility})`);
  assert(!profile.isPublicFigure || profile.compatibility >= 0, "Custom party non crasha");
}

async function testSimulationTextDifference() {
  const basePlayer: GamePlayer = {
    id: "p1",
    displayName: "Test",
    party: { slug: "partito-democratico", name: "PD", color: "#E4002B", ideologyScore: -0.35 },
    candidate: { firstName: "Mario", lastName: "Rossi", description: "Candidato generico." },
    isHuman: true,
  };
  const progressivePlayer: GamePlayer = {
    ...basePlayer,
    candidate: {
      ...basePlayer.candidate,
      description: "Leader progressista europeista.",
      program:
        "Diritti civili, clima, welfare, sanità pubblica, Europa democratica, inclusione e parità.",
    },
  };
  const [rBase, rProg] = await Promise.all([
    gameSimulationEngine.simulate([basePlayer], {
      mode: "singleplayer",
      redistributionMode: "candidates_only",
      realPartySlugs: [],
      seed: 555,
    }),
    gameSimulationEngine.simulate([progressivePlayer], {
      mode: "singleplayer",
      redistributionMode: "candidates_only",
      realPartySlugs: [],
      seed: 555,
    }),
  ]);
  const pctBase = rBase.players[0]!.percentage;
  const pctProg = rProg.players[0]!.percentage;
  console.log(`  Testo influenza simulazione: generico ${pctBase}% vs progressista ${pctProg}%`);
  assert(pctProg > pctBase, `Programma progressista migliora risultato PD (${pctProg} vs ${pctBase})`);
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

async function testSurnameOnlyRecognition() {
  const parsed = (await import("../src/lib/game/parseCandidateName")).parseCandidateName("Meloni");
  const profile = await candidateRecognizer.recognize(
    {
      firstName: parsed.firstName,
      lastName: parsed.lastName,
      description: "Leader di destra, Presidente del Consiglio.",
    },
    { slug: "fratelli-ditalia", name: "FdI", color: "#0A2F6B" },
    "Sovranità nazionale, famiglia, ordine e sicurezza.",
  );
  console.log(
    `  Cognome solo "Meloni" → ${profile.name}, pop ${profile.popularity}, compat ${profile.compatibility}`,
  );
  assert(profile.name.includes("Meloni"), `Nome corretto (got ${profile.name})`);
  assert(profile.isPublicFigure, "Meloni riconosciuta da cognome solo");
  assert(profile.popularity >= 55, `Popolarità Meloni alta (got ${profile.popularity})`);
  assert(profile.compatibility >= 70, `Compatibilità FdI alta (got ${profile.compatibility})`);
}

async function testVpPreviewEffect() {
  const profile = await candidateRecognizer.recognize(
    {
      firstName: "Giorgia",
      lastName: "Meloni",
      description: "Presidente del Consiglio, leader di Fratelli d'Italia.",
    },
    { slug: "fratelli-ditalia", name: "FdI", color: "#0A2F6B" },
    "Sovranità e sicurezza.",
    { firstName: "Ignazio", lastName: "La Russa" },
  );
  console.log(`  Meloni + La Russa VP → effetto VP ${profile.vicePresidentEffect.toFixed(1)}pp`);
  assert(profile.vicePresidentEffect > 0, `VP coerente dà boost (got ${profile.vicePresidentEffect})`);
}

async function main() {
  console.log("\n=== Italia Elect Game — test suite ===\n");

  await testElonMuskAvs();
  await testLeftProgram();
  testRedistributionWithoutFdi();
  await testMeloniVsSchlein();
  await testSurnameOnlyRecognition();
  await testVpPreviewEffect();
  await testRegionalMap();
  await testSinglePlayer();
  await testProgressiveTextShiftsPd();
  await testRightTextOnPdPenalty();
  await testCustomPartyWorks();
  await testSimulationTextDifference();
  await testComputerHardWinRate();

  console.log("\n✓ Tutti i test game passati\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
