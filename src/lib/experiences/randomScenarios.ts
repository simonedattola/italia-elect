export interface RandomScenario {
  id: string;
  title: string;
  description: string;
  effects: Array<{ label: string; before: string; after: string }>;
  voteImpact: Record<string, number>;
  factorOverrides: Record<string, number>;
}

export const RANDOM_SCENARIOS: RandomScenario[] = [
  {
    id: "crisi-economica",
    title: "Crisi Economica",
    description: "Inflazione in accelerazione, spread in aumento, fiducia imprese in calo.",
    effects: [
      { label: "Inflazione", before: "5%", after: "8.5%" },
      { label: "Disoccupazione", before: "8%", after: "11%" },
      { label: "Spread", before: "150", after: "250" },
    ],
    voteImpact: {
      "fratelli-ditalia": -2.0,
      "partito-democratico": 1.5,
      "movimento-5-stelle": 2.0,
      "futuro-nazionale": 1.5,
      lega: -0.8,
    },
    factorOverrides: { inflazione_ipc: 0.85, spread_btp_bund: 0.75, fiducia_imprese: -0.6 },
  },
  {
    id: "crisi-immigrazione",
    title: "Crisi Migratoria",
    description: "Picco arrivi e tensioni sui blocchi navali.",
    effects: [
      { label: "Arrivi mensili", before: "8k", after: "18k" },
      { label: "Indice sicurezza", before: "62", after: "48" },
    ],
    voteImpact: {
      lega: 2.5,
      "fratelli-ditalia": 1.2,
      "futuro-nazionale": 1.8,
      "partito-democratico": -1.5,
      avss: -0.5,
    },
    factorOverrides: { immigrazione_flussi: 0.9, criminalita_reati: 0.5 },
  },
  {
    id: "vittoria-nazionale",
    title: "Vittoria Sportiva Nazionale",
    description: "La nazionale vince un titolo internazionale — effetto rally patriottico.",
    effects: [
      { label: "Umore nazionale", before: "Neutro", after: "Euforico" },
      { label: "Trust governo", before: "42%", after: "48%" },
    ],
    voteImpact: {
      "fratelli-ditalia": 1.5,
      lega: 0.8,
      "forza-italia": 0.5,
      "partito-democratico": -0.3,
    },
    factorOverrides: { sport_nazionale: 0.95, umore_nazionale: 0.8 },
  },
  {
    id: "scandalo-corruzione",
    title: "Scandalo Corruzione",
    description: "Indagine su appalti pubblici coinvolge esponenti di governo.",
    effects: [
      { label: "Trust istituzioni", before: "38%", after: "28%" },
      { label: "Antipolitica", before: "Medio", after: "Alto" },
    ],
    voteImpact: {
      "fratelli-ditalia": -2.5,
      "movimento-5-stelle": 2.2,
      "partito-democratico": -1.0,
      "futuro-nazionale": 1.0,
    },
    factorOverrides: { corruzione_percezione: 0.85, fiducia_governo: -0.7 },
  },
  {
    id: "crisi-sanita",
    title: "Crisi Sanitaria",
    description: "Liste d'attesa record e sciopero del personale.",
    effects: [
      { label: "Liste d'attesa", before: "65 giorni", after: "95 giorni" },
      { label: "Soddisfazione sanità", before: "52%", after: "35%" },
    ],
    voteImpact: {
      "partito-democratico": 1.8,
      avss: 1.2,
      "fratelli-ditalia": -1.5,
      "movimento-5-stelle": 0.8,
    },
    factorOverrides: { sanita_liste_attesa: 0.9, sanita_spesa: -0.4 },
  },
  {
    id: "exit-eu-rumor",
    title: "Tensioni UE",
    description: "Bruxelles minaccia sanzioni; narrativa Italexit torna virale.",
    effects: [
      { label: "Spread", before: "150", after: "220" },
      { label: "Euroscetticismo", before: "32%", after: "45%" },
    ],
    voteImpact: {
      lega: 2.0,
      "futuro-nazionale": 2.5,
      italexit: 1.5,
      "fratelli-ditalia": 0.5,
      "partito-democratico": -1.2,
    },
    factorOverrides: { geopolitica_ue: -0.8, spread_btp_bund: 0.6 },
  },
  {
    id: "green-wave",
    title: "Green Wave",
    description: "Eventi climatici estremi spingono l'agenda ambientale.",
    effects: [
      { label: "Priorità ambiente", before: "Media", after: "Alta" },
      { label: "Sondaggi AVS", before: "6.5%", after: "9.2%" },
    ],
    voteImpact: {
      avss: 2.5,
      "partito-democratico": 0.8,
      "movimento-5-stelle": 1.0,
      "fratelli-ditalia": -0.5,
    },
    factorOverrides: { ambiente_eventi_estremi: 0.85, ambiente_inquinamento: 0.6 },
  },
  {
    id: "tech-boom",
    title: "Boom Digitale",
    description: "Investimenti in AI e semiconductor — narrativa progressista.",
    effects: [
      { label: "Fiducia imprese tech", before: "55", after: "72" },
      { label: "Occupazione giovani", before: "28%", after: "24%" },
    ],
    voteImpact: {
      "azione-iv": 1.5,
      "partito-democratico": 1.0,
      "movimento-5-stelle": 0.5,
      lega: -0.5,
    },
    factorOverrides: { economia_pil: 0.7, educazione_digitalizzazione: 0.65 },
  },
  {
    id: "coalizione-sorpresa",
    title: "Coalizione Sorpresa",
    description: "PD e M5S annunciano alleanza elettorale.",
    effects: [
      { label: "Polarizzazione", before: "Alta", after: "Media" },
      { label: "Transfer voti CS", before: "—", after: "+3.5% PD" },
    ],
    voteImpact: {
      "partito-democratico": 3.0,
      "movimento-5-stelle": -1.5,
      "fratelli-ditalia": 1.0,
      lega: 0.5,
    },
    factorOverrides: { politica_coalizioni: 0.5 },
  },
  {
    id: "blackout-nazionale",
    title: "Blackout Nazionale",
    description: "Blackout elettrico di 48 ore in tutta Italia.",
    effects: [
      { label: "Fiducia governo", before: "42%", after: "31%" },
      { label: "Ansia pubblica", before: "Media", after: "Alta" },
    ],
    voteImpact: {
      "fratelli-ditalia": -3.0,
      "movimento-5-stelle": 2.5,
      "partito-democratico": 1.5,
      "futuro-nazionale": 1.0,
    },
    factorOverrides: { infrastrutture_energia: -0.9, umore_ansia: 0.8 },
  },
];

export function pickRandomScenario(seed?: number): RandomScenario {
  const idx =
    seed != null
      ? seed % RANDOM_SCENARIOS.length
      : Math.floor(Math.random() * RANDOM_SCENARIOS.length);
  return RANDOM_SCENARIOS[idx]!;
}
