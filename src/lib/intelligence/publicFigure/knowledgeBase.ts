/**
 * Knowledge base curata — figure pubbliche italiane documentate.
 * Match SOLO esatto (niente omonimi parziali).
 */

import type { PublicFigureProfile } from "./types";

type Seed = Omit<
  PublicFigureProfile,
  | "normalizedKey"
  | "name"
  | "canonicalName"
  | "publicFigure"
  | "confidence"
  | "roleCategory"
  | "associatedParties"
  | "occupations"
  | "importantDates"
  | "notorietyScore"
  | "mediaExposureScore"
  | "polarizationScore"
  | "personalBrandScore"
  | "lastUpdated"
  | "fromCache"
  | "recognitionMethod"
  | "insufficientData"
  | "needsConfirmation"
  | "confirmationPrompt"
  | "candidateOptions"
  | "dbpediaUri"
  | "message"
> & {
  firstName: string;
  lastName: string;
  aliases?: string[];
};

export const CURATED_PUBLIC_FIGURES: (Seed & { aliases?: string[] })[] = [
  {
    firstName: "Silvio",
    lastName: "Berlusconi",
    identity: "former_politician",
    category: "NATIONAL_PUBLIC",
    biography:
      "Imprenditore e politico italiano; fondatore di Forza Italia; più volte Presidente del Consiglio dei Ministri (1994-1995, 2001-2006, 2008-2011). Figura centrale della Seconda Repubblica. Deceduto nel 2023.",
    politicalHistory: [
      "Fondatore di Forza Italia (1994)",
      "Presidente del Consiglio 1994-1995",
      "Presidente del Consiglio 2001-2006",
      "Presidente del Consiglio 2008-2011",
      "Leader storico del centrodestra italiano",
    ],
    positions: [
      "Presidente del Consiglio dei Ministri (ex)",
      "Deputato / Senatore (ex)",
      "Europarlamentare (ex)",
    ],
    partyHistory: ["Forza Italia", "Il Popolo della Libertà", "Forza Italia (rilancio)"],
    mediaExposure: 98,
    publicRecognition: 99,
    defaultPartySlug: "forza-italia",
    ideologyHint: 0.35,
    controversies: {
      verifiedFacts: [
        "Ruoli istituzionali di Presidente del Consiglio (fatti pubblici).",
        "Fondazione di Forza Italia (1994).",
      ],
      proceedings: [
        "Numerose vicende giudiziarie oggetto di ampia cronaca: verificare sempre lo stato aggiornato da fonti ufficiali.",
      ],
      finalConvictions: [
        "Esistono sentenze definitive riportate da fonti giudiziarie e stampa: riportare solo dati ufficiali aggiornati, senza ampliamenti.",
      ],
      accusations: ["Distinguere accuse, fasi processuali e provvedimenti definitivi."],
      publicOpinions: [
        "Figura altamente polarizzante nell'opinione pubblica italiana (opinione/percezione, non fatto giuridico).",
      ],
    },
    sources: [
      { title: "Camera / Senato — archivi istituzionali", type: "istituzionale" },
      { title: "Governo italiano — Presidenti del Consiglio", url: "https://www.governo.it/", type: "istituzionale" },
      { title: "Wikidata / Wikipedia (verifica)", type: "wikipedia", url: "https://www.wikidata.org/wiki/Q11859" },
    ],
    wikidataId: "Q11860",
    wikipediaUrl: "https://it.wikipedia.org/wiki/Silvio_Berlusconi",
    inferredScores: {
      credibility: 40,
      experience: 95,
      competence: 65,
      leadership: 88,
      communication: 92,
      popularity: 55,
      scandalRisk: 75,
      mediaConsensus: 50,
      socialConsensus: 60,
      undecidedAppeal: 35,
      mobilization: 85,
      trust: 38,
      polarization: 92,
      personalLoyalty: 88,
    },
  },
  {
    firstName: "Giorgia",
    lastName: "Meloni",
    identity: "politician",
    category: "NATIONAL_PUBLIC",
    biography:
      "Politica italiana, Presidente del Consiglio dei Ministri; leader di Fratelli d'Italia.",
    politicalHistory: [
      "Ministro per la gioventù (2008-2011)",
      "Leader di Fratelli d'Italia",
      "Presidente del Consiglio dal 2022",
    ],
    positions: ["Presidente del Consiglio dei Ministri", "Deputata"],
    partyHistory: ["Alleanza Nazionale", "Popolo della Libertà", "Fratelli d'Italia"],
    mediaExposure: 94,
    publicRecognition: 96,
    defaultPartySlug: "fratelli-ditalia",
    ideologyHint: 0.7,
    controversies: {
      verifiedFacts: ["Ruolo istituzionale di Presidente del Consiglio (fatto pubblico)."],
      proceedings: [],
      finalConvictions: [],
      accusations: [],
      publicOpinions: ["Valutazioni sulla leadership variano secondo schieramento."],
    },
    sources: [
      { title: "Governo italiano", url: "https://www.governo.it/", type: "istituzionale" },
    ],
    wikidataId: "Q164072",
    inferredScores: {
      credibility: 62, experience: 88, competence: 68, leadership: 82,
      communication: 80, popularity: 58, scandalRisk: 28, mediaConsensus: 55,
      socialConsensus: 70, undecidedAppeal: 40, mobilization: 80,
      trust: 55, polarization: 70, personalLoyalty: 75,
    },
  },
  {
    firstName: "Matteo",
    lastName: "Salvini",
    identity: "politician",
    category: "NATIONAL_PUBLIC",
    biography: "Politico italiano, leader della Lega; più volte ministro e vicepresidente del Consiglio.",
    politicalHistory: ["Segretario Lega", "Ministro dell'Interno", "Ministro delle Infrastrutture"],
    positions: ["Vicepresidente del Consiglio (ex)", "Ministro", "Senatore/Deputato"],
    partyHistory: ["Lega Nord", "Lega"],
    mediaExposure: 90,
    publicRecognition: 93,
    defaultPartySlug: "lega",
    ideologyHint: 0.65,
    controversies: {
      verifiedFacts: ["Incarichi ministeriali e di partito pubblici."],
      proceedings: ["Vicende giudiziarie/politiche riportate dalla stampa (verificare stato aggiornato)."],
      finalConvictions: [],
      accusations: [],
      publicOpinions: ["Figura polarizzante."],
    },
    sources: [{ title: "Senato / Camera", type: "istituzionale" }],
    wikidataId: "Q47559",
    inferredScores: {
      credibility: 48, experience: 85, competence: 55, leadership: 70,
      communication: 78, popularity: 55, scandalRisk: 55, mediaConsensus: 50,
      socialConsensus: 72, undecidedAppeal: 35, mobilization: 75,
      trust: 42, polarization: 85, personalLoyalty: 70,
    },
  },
  {
    firstName: "Elly",
    lastName: "Schlein",
    identity: "politician",
    category: "NATIONAL_PUBLIC",
    biography: "Politica italiana, segretaria del Partito Democratico.",
    politicalHistory: ["Europarlamentare", "Vicepresidente Emilia-Romagna", "Segretaria PD"],
    positions: ["Segretaria Partito Democratico", "Deputata"],
    partyHistory: ["Partito Democratico"],
    mediaExposure: 75,
    publicRecognition: 80,
    defaultPartySlug: "partito-democratico",
    ideologyHint: -0.45,
    controversies: {
      verifiedFacts: ["Ruolo di segretaria PD (fatto pubblico)."],
      proceedings: [],
      finalConvictions: [],
      accusations: [],
      publicOpinions: [],
    },
    sources: [{ title: "Partito Democratico", type: "partito" }],
    wikidataId: "Q15220542",
    inferredScores: {
      credibility: 58, experience: 55, competence: 62, leadership: 60,
      communication: 68, popularity: 48, scandalRisk: 22, mediaConsensus: 55,
      socialConsensus: 58, undecidedAppeal: 45, mobilization: 55,
      trust: 52, polarization: 55, personalLoyalty: 50,
    },
  },
  {
    firstName: "Giuseppe",
    lastName: "Conte",
    identity: "former_politician",
    category: "NATIONAL_PUBLIC",
    biography: "Giurista e politico; ex Presidente del Consiglio; leader del Movimento 5 Stelle.",
    politicalHistory: ["PdCM 2018-2021", "Presidente M5S"],
    positions: ["Presidente del Consiglio (ex)", "Presidente M5S"],
    partyHistory: ["Movimento 5 Stelle"],
    mediaExposure: 82,
    publicRecognition: 90,
    defaultPartySlug: "movimento-5-stelle",
    ideologyHint: -0.15,
    controversies: {
      verifiedFacts: ["Ex Presidente del Consiglio."],
      proceedings: [],
      finalConvictions: [],
      accusations: [],
      publicOpinions: [],
    },
    sources: [{ title: "Governo italiano (archivio)", type: "istituzionale" }],
    wikidataId: "Q55059223",
    inferredScores: {
      credibility: 55, experience: 75, competence: 65, leadership: 65,
      communication: 60, popularity: 50, scandalRisk: 32, mediaConsensus: 52,
      socialConsensus: 55, undecidedAppeal: 48, mobilization: 60,
      trust: 50, polarization: 55, personalLoyalty: 58,
    },
  },
  {
    firstName: "Antonio",
    lastName: "Tajani",
    identity: "politician",
    category: "NATIONAL_PUBLIC",
    biography: "Politico italiano, leader di Forza Italia; ex Presidente Parlamento europeo.",
    politicalHistory: ["Commissario UE", "Presidente PE", "Ministro degli Esteri", "Segretario FI"],
    positions: ["Segretario Forza Italia", "Ministro", "Europarlamentare"],
    partyHistory: ["Forza Italia", "Popolo della Libertà"],
    mediaExposure: 65,
    publicRecognition: 72,
    defaultPartySlug: "forza-italia",
    ideologyHint: 0.3,
    controversies: {
      verifiedFacts: ["Ruoli istituzionali europei e nazionali pubblici."],
      proceedings: [],
      finalConvictions: [],
      accusations: [],
      publicOpinions: [],
    },
    sources: [{ title: "Forza Italia / Parlamento europeo", type: "istituzionale" }],
    wikidataId: "Q29480",
    inferredScores: {
      credibility: 60, experience: 90, competence: 70, leadership: 55,
      communication: 55, popularity: 40, scandalRisk: 18, mediaConsensus: 50,
      socialConsensus: 35, undecidedAppeal: 42, mobilization: 40,
      trust: 55, polarization: 35, personalLoyalty: 45,
    },
  },
  {
    firstName: "Mario",
    lastName: "Draghi",
    identity: "institutional",
    category: "NATIONAL_PUBLIC",
    biography: "Economista; ex Presidente BCE; ex Presidente del Consiglio.",
    politicalHistory: ["Presidente BCE", "PdCM 2021-2022"],
    positions: ["Presidente del Consiglio (ex)", "Presidente BCE (ex)"],
    partyHistory: [],
    mediaExposure: 78,
    publicRecognition: 92,
    ideologyHint: 0.05,
    controversies: {
      verifiedFacts: ["Ex PdCM e Presidente BCE."],
      proceedings: [],
      finalConvictions: [],
      accusations: [],
      publicOpinions: [],
    },
    sources: [{ title: "BCE / Governo italiano", type: "istituzionale" }],
    wikidataId: "Q43516",
    inferredScores: {
      credibility: 78, experience: 95, competence: 90, leadership: 85,
      communication: 55, popularity: 52, scandalRisk: 15, mediaConsensus: 70,
      socialConsensus: 40, undecidedAppeal: 60, mobilization: 35,
      trust: 72, polarization: 40, personalLoyalty: 50,
    },
  },
  {
    firstName: "Massimo",
    lastName: "Bossetti",
    identity: "media_figure",
    category: "NATIONAL_PUBLIC",
    biography:
      "Figura nota al pubblico italiano principalmente per vicende giudiziarie ampiamente riportate dalla stampa. Non è un esponente politico.",
    politicalHistory: [],
    positions: [],
    partyHistory: [],
    mediaExposure: 70,
    publicRecognition: 68,
    controversies: {
      verifiedFacts: ["Notorietà mediatica legata a procedimenti giudiziari riportati pubblicamente."],
      proceedings: [
        "Procedimenti e decisioni giudiziarie oggetto di ampia cronaca: verificare sempre lo stato aggiornato da fonti ufficiali.",
      ],
      finalConvictions: [
        "Eventuali sentenze definitive vanno riportate solo da fonti giudiziarie ufficiali aggiornate.",
      ],
      accusations: ["Distinguere accuse, fasi processuali e provvedimenti definitivi."],
      publicOpinions: ["L'opinione pubblica è polarizzata; non costituisce fatto giuridico."],
    },
    sources: [{ title: "Copertura giornalistica pubblica", type: "giornalistico" }],
    inferredScores: {
      credibility: 12, experience: 8, competence: 15, leadership: 12,
      communication: 18, popularity: 6, scandalRisk: 96, mediaConsensus: 8,
      socialConsensus: 10, undecidedAppeal: 4, mobilization: 6,
      trust: 8, polarization: 90, personalLoyalty: 5,
    },
  },
  {
    firstName: "Beppe",
    lastName: "Sala",
    aliases: ["Giuseppe Sala"],
    identity: "politician",
    category: "LOCAL_PUBLIC",
    biography: "Sindaco di Milano; figura pubblica locale/nazionale di secondo piano.",
    politicalHistory: ["Expo 2015", "Sindaco di Milano"],
    positions: ["Sindaco di Milano"],
    partyHistory: ["Area centrosinistra"],
    mediaExposure: 48,
    publicRecognition: 55,
    defaultPartySlug: "partito-democratico",
    ideologyHint: -0.25,
    controversies: {
      verifiedFacts: ["Sindaco di Milano (incarico pubblico)."],
      proceedings: [],
      finalConvictions: [],
      accusations: [],
      publicOpinions: [],
    },
    sources: [{ title: "Comune di Milano", url: "https://www.comune.milano.it/", type: "istituzionale" }],
    inferredScores: {
      credibility: 55, experience: 70, competence: 65, leadership: 55,
      communication: 50, popularity: 45, scandalRisk: 25, mediaConsensus: 48,
      socialConsensus: 40, undecidedAppeal: 40, mobilization: 42,
      trust: 52, polarization: 35, personalLoyalty: 40,
    },
  },
  {
    firstName: "Matteo",
    lastName: "Renzi",
    identity: "former_politician",
    category: "NATIONAL_PUBLIC",
    biography: "Politico italiano; ex Presidente del Consiglio; fondatore di Italia Viva.",
    politicalHistory: ["Sindaco di Firenze", "Segretario PD", "PdCM 2014-2016", "Fondatore Italia Viva"],
    positions: ["Presidente del Consiglio (ex)", "Senatore"],
    partyHistory: ["Partito Democratico", "Italia Viva"],
    mediaExposure: 80,
    publicRecognition: 88,
    defaultPartySlug: "azione-iv",
    ideologyHint: 0.0,
    controversies: {
      verifiedFacts: ["Ex Presidente del Consiglio; fondatore Italia Viva."],
      proceedings: [],
      finalConvictions: [],
      accusations: [],
      publicOpinions: ["Percezione pubblica polarizzata sul periodo di governo."],
    },
    sources: [{ title: "Governo italiano (archivio)", type: "istituzionale" }],
    wikidataId: "Q47563",
    inferredScores: {
      credibility: 45, experience: 80, competence: 65, leadership: 70,
      communication: 75, popularity: 35, scandalRisk: 40, mediaConsensus: 45,
      socialConsensus: 50, undecidedAppeal: 40, mobilization: 55,
      trust: 40, polarization: 75, personalLoyalty: 45,
    },
  },
  {
    firstName: "Carlo",
    lastName: "Calenda",
    identity: "politician",
    category: "NATIONAL_PUBLIC",
    biography: "Politico e manager; fondatore di Azione; ex Ministro dello Sviluppo economico.",
    politicalHistory: ["Ministro Sviluppo economico", "Fondatore Azione", "Europarlamentare/Senatore"],
    positions: ["Leader Azione", "ex Ministro"],
    partyHistory: ["PD (breve)", "Azione"],
    mediaExposure: 70,
    publicRecognition: 68,
    defaultPartySlug: "azione-iv",
    ideologyHint: 0.08,
    controversies: {
      verifiedFacts: ["Incarichi ministeriali e di partito pubblici."],
      proceedings: [],
      finalConvictions: [],
      accusations: [],
      publicOpinions: [],
    },
    sources: [{ title: "Azione / Parlamento", type: "partito" }],
    wikidataId: "Q20007855",
    inferredScores: {
      credibility: 55, experience: 70, competence: 70, leadership: 58,
      communication: 65, popularity: 38, scandalRisk: 25, mediaConsensus: 50,
      socialConsensus: 45, undecidedAppeal: 48, mobilization: 45,
      trust: 50, polarization: 50, personalLoyalty: 40,
    },
  },
];

export function normalizePersonKey(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function findCuratedFigure(firstName: string, lastName: string) {
  const key = normalizePersonKey(firstName, lastName);
  for (const rec of CURATED_PUBLIC_FIGURES) {
    if (normalizePersonKey(rec.firstName, rec.lastName) === key) return rec;
    for (const a of rec.aliases ?? []) {
      const norm = a
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim();
      if (norm === key) return rec;
    }
  }
  return null;
}
