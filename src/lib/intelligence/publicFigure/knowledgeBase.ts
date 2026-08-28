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
    aliases: ["Berlusconi"],
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
    aliases: ["Meloni"],
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
    aliases: ["Salvini"],
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
    aliases: ["Schlein"],
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
    aliases: ["Conte"],
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
    aliases: ["Draghi"],
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
    firstName: "Ignazio",
    lastName: "La Russa",
    aliases: ["La Russa"],
    identity: "politician",
    category: "NATIONAL_PUBLIC",
    biography: "Politico italiano, presidente del Senato; cofondatore di Fratelli d'Italia.",
    politicalHistory: ["Cofondatore FdI", "Ministro della Difesa", "Presidente del Senato"],
    positions: ["Presidente del Senato", "Senatore"],
    partyHistory: ["Alleanza Nazionale", "Fratelli d'Italia"],
    mediaExposure: 72,
    publicRecognition: 78,
    defaultPartySlug: "fratelli-ditalia",
    ideologyHint: 0.72,
    controversies: {
      verifiedFacts: ["Presidente del Senato (incarico pubblico)."],
      proceedings: [],
      finalConvictions: [],
      accusations: [],
      publicOpinions: [],
    },
    sources: [{ title: "Senato della Repubblica", type: "istituzionale" }],
    wikidataId: "Q3791577",
    inferredScores: {
      credibility: 52, experience: 82, competence: 58, leadership: 62,
      communication: 55, popularity: 42, scandalRisk: 38, mediaConsensus: 48,
      socialConsensus: 55, undecidedAppeal: 32, mobilization: 58,
      trust: 48, polarization: 68, personalLoyalty: 72,
    },
  },
  {
    firstName: "Luigi",
    lastName: "Di Maio",
    aliases: ["Di Maio"],
    identity: "politician",
    category: "NATIONAL_PUBLIC",
    biography: "Politico italiano; ex leader M5S e ministro degli Esteri.",
    politicalHistory: ["Vicepresidente Consiglio", "Ministro Esteri", "Leader M5S"],
    positions: ["Ministro degli Esteri (ex)", "Deputato"],
    partyHistory: ["Movimento 5 Stelle", "Impegno Civico"],
    mediaExposure: 78,
    publicRecognition: 82,
    defaultPartySlug: "movimento-5-stelle",
    ideologyHint: -0.1,
    controversies: {
      verifiedFacts: ["Incarichi ministeriali pubblici."],
      proceedings: [],
      finalConvictions: [],
      accusations: [],
      publicOpinions: [],
    },
    sources: [{ title: "Camera dei deputati", type: "istituzionale" }],
    wikidataId: "Q19874309",
    inferredScores: {
      credibility: 50, experience: 68, competence: 55, leadership: 58,
      communication: 62, popularity: 45, scandalRisk: 35, mediaConsensus: 48,
      socialConsensus: 52, undecidedAppeal: 40, mobilization: 55,
      trust: 45, polarization: 60, personalLoyalty: 55,
    },
  },
  {
    firstName: "Roberto",
    lastName: "Gualtieri",
    aliases: ["Gualtieri"],
    identity: "politician",
    category: "NATIONAL_PUBLIC",
    biography: "Economista e politico; sindaco di Roma; ex ministro dell'Economia.",
    politicalHistory: ["Ministro Economia", "Europarlamentare", "Sindaco di Roma"],
    positions: ["Sindaco di Roma", "ex Ministro"],
    partyHistory: ["Partito Democratico"],
    mediaExposure: 58,
    publicRecognition: 65,
    defaultPartySlug: "partito-democratico",
    ideologyHint: -0.35,
    controversies: {
      verifiedFacts: ["Sindaco di Roma (incarico pubblico)."],
      proceedings: [],
      finalConvictions: [],
      accusations: [],
      publicOpinions: [],
    },
    sources: [{ title: "Comune di Roma", type: "istituzionale" }],
    wikidataId: "Q3939434",
    inferredScores: {
      credibility: 62, experience: 75, competence: 72, leadership: 58,
      communication: 52, popularity: 40, scandalRisk: 20, mediaConsensus: 52,
      socialConsensus: 42, undecidedAppeal: 38, mobilization: 42,
      trust: 55, polarization: 40, personalLoyalty: 45,
    },
  },
  {
    firstName: "Roberto",
    lastName: "Vannacci",
    aliases: ["Vannacci"],
    identity: "politician",
    category: "NATIONAL_PUBLIC",
    biography:
      "Generale dell'Arma dei Carabinieri ed europarlamentatore. Presidente e fondatore di Futuro Nazionale (2026). Ex vicesegretario della Lega. Posizioni nazionaliste, sovraniste ed euroscettiche.",
    politicalHistory: [
      "Presidente di Futuro Nazionale (dal 2026)",
      "Fondatore di Futuro Nazionale",
      "Ex vicesegretario della Lega (2025-2026)",
      "Europarlamentatore (dal 2024)",
    ],
    positions: ["Presidente Futuro Nazionale", "Europarlamentare"],
    partyHistory: ["Futuro Nazionale", "Lega"],
    mediaExposure: 78,
    publicRecognition: 74,
    defaultPartySlug: "futuro-nazionale",
    ideologyHint: 0.75,
    controversies: {
      verifiedFacts: ["Presidente di Futuro Nazionale (2026).", "Europarlamentare."],
      proceedings: [],
      finalConvictions: [],
      accusations: [],
      publicOpinions: ["Figura polarizzante su immigrazione, Europa e identità."],
    },
    sources: [
      { title: "Futuro Nazionale", type: "partito" },
      { title: "Wikipedia", url: "https://it.wikipedia.org/wiki/Roberto_Vannacci", type: "wikipedia" },
    ],
    wikidataId: "Q131026120",
    inferredScores: {
      credibility: 48, experience: 72, competence: 58, leadership: 62,
      communication: 70, popularity: 52, scandalRisk: 38, mediaConsensus: 48,
      socialConsensus: 55, undecidedAppeal: 28, mobilization: 68,
      trust: 42, polarization: 82, personalLoyalty: 72,
    },
  },
  {
    firstName: "Elon",
    lastName: "Musk",
    identity: "entrepreneur",
    category: "NATIONAL_PUBLIC",
    biography: "Imprenditore statunitense; CEO di Tesla e SpaceX; figura globale dell'innovazione tech.",
    politicalHistory: [],
    positions: ["CEO Tesla", "CEO SpaceX"],
    partyHistory: [],
    mediaExposure: 98,
    publicRecognition: 95,
    ideologyHint: 0.55,
    controversies: {
      verifiedFacts: ["Ruoli pubblici documentati nelle aziende citate."],
      proceedings: [],
      finalConvictions: [],
      accusations: [],
      publicOpinions: ["Figura altamente polarizzante a livello globale."],
    },
    sources: [{ title: "Wikidata", type: "wikipedia", url: "https://www.wikidata.org/wiki/Q317521" }],
    wikidataId: "Q317521",
    inferredScores: {
      credibility: 45, experience: 90, competence: 85, leadership: 88,
      communication: 75, popularity: 70, scandalRisk: 55, mediaConsensus: 50,
      socialConsensus: 45, undecidedAppeal: 35, mobilization: 40,
      trust: 40, polarization: 80, personalLoyalty: 50,
    },
  },
  {
    firstName: "Beppe",
    lastName: "Grillo",
    aliases: ["Grillo"],
    identity: "former_politician",
    category: "NATIONAL_PUBLIC",
    biography: "Comico e fondatore del Movimento 5 Stelle; figura storica della politica italiana.",
    politicalHistory: ["Fondatore M5S", "Campagna referendaria"],
    positions: ["Fondatore M5S"],
    partyHistory: ["Movimento 5 Stelle"],
    mediaExposure: 85,
    publicRecognition: 90,
    defaultPartySlug: "movimento-5-stelle",
    ideologyHint: -0.2,
    controversies: {
      verifiedFacts: ["Fondatore del Movimento 5 Stelle."],
      proceedings: [],
      finalConvictions: [],
      accusations: [],
      publicOpinions: ["Figura polarizzante."],
    },
    sources: [{ title: "Wikipedia", type: "wikipedia" }],
    wikidataId: "Q376229",
    inferredScores: {
      credibility: 42, experience: 70, competence: 50, leadership: 72,
      communication: 90, popularity: 55, scandalRisk: 45, mediaConsensus: 45,
      socialConsensus: 60, undecidedAppeal: 38, mobilization: 70,
      trust: 38, polarization: 85, personalLoyalty: 65,
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
    aliases: ["Renzi"],
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

/** Cognome solo — se univoco nella KB, restituisce la figura. */
export function findCuratedBySurname(surname: string) {
  const norm = surname
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!norm) return null;

  const matches = CURATED_PUBLIC_FIGURES.filter((rec) => {
    const last = rec.lastName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (last === norm) return true;
    return (rec.aliases ?? []).some((a) => {
      const alias = a
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim();
      return alias === norm;
    });
  });

  if (matches.length === 1) return matches[0]!;
  if (matches.length > 1) {
    return [...matches].sort((a, b) => b.publicRecognition - a.publicRecognition)[0]!;
  }
  return null;
}
