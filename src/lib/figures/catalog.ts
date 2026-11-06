/**
 * Archivio curato di figure pubbliche. Le posizioni sono uno schema di gioco,
 * non un giudizio e non un programma. I testi restano descrittivi.
 */

export type FigureConstraint = "none" | "fascist-reorganization" | "totalitarian-historical" | "authoritarian-foreign";

export interface PublicFigure {
  id: string;
  name: string;
  aliases: string[];
  alive: boolean;
  died?: string;
  /** Asse sinistra-destra dello schema, −1…+1. */
  ideology: number;
  /** Quanto il nome è riconoscibile, 0–100. Non è il consenso elettorale. */
  notoriety: number;
  /** Liste con cui la figura è storicamente associata. */
  naturalParties: string[];
  constraint: FigureConstraint;
  /** Fatti pubblici in una riga, senza valutazioni celebrative. */
  record: string;
}

export const SCELBA_NOTE =
  "Nota informativa. La XII disposizione transitoria e finale della Costituzione vieta la riorganizzazione, sotto qualsiasi forma, del disciolto partito fascista. La legge 20 giugno 1952, n. 645 (legge Scelba) punisce quella riorganizzazione. Questa simulazione è un esercizio controfattuale: non propone simboli, non è un invito a organizzare una lista e non è un parere legale.";

export const TOTALITARIAN_NOTE =
  "Nota informativa. È una figura storica di un regime totalitario, non più in vita. Il modello applica un tetto di consenso molto basso e una mobilitazione degli avversari. Non è un contenuto celebrativo e non usa simboli di quei regimi.";

export const AUTHORITARIAN_NOTE =
  "Nota informativa. È un capo di Stato estero associato a un sistema autoritario. In questa simulazione non è un candidato competitivo di un'elezione italiana: il modello applica un tetto basso e una reazione delle altre liste. Non è un contenuto celebrativo.";

export const FIGURES: PublicFigure[] = [
  { id: "giorgia-meloni", name: "Giorgia Meloni", aliases: ["meloni"], alive: true, ideology: 0.72, notoriety: 92, naturalParties: ["fratelli-ditalia"], constraint: "none", record: "Presidente del Consiglio dal 2022 e presidente di Fratelli d'Italia." },
  { id: "elly-schlein", name: "Elly Schlein", aliases: ["schlein"], alive: true, ideology: -0.42, notoriety: 74, naturalParties: ["partito-democratico"], constraint: "none", record: "Segretaria del Partito Democratico." },
  { id: "giuseppe-conte", name: "Giuseppe Conte", aliases: ["conte"], alive: true, ideology: -0.12, notoriety: 80, naturalParties: ["movimento-5-stelle"], constraint: "none", record: "Presidente del Movimento 5 Stelle, già Presidente del Consiglio." },
  { id: "matteo-salvini", name: "Matteo Salvini", aliases: ["salvini"], alive: true, ideology: 0.66, notoriety: 84, naturalParties: ["lega"], constraint: "none", record: "Segretario della Lega e ministro delle Infrastrutture." },
  { id: "antonio-tajani", name: "Antonio Tajani", aliases: ["tajani"], alive: true, ideology: 0.32, notoriety: 62, naturalParties: ["forza-italia"], constraint: "none", record: "Segretario di Forza Italia e ministro degli Esteri." },
  { id: "matteo-renzi", name: "Matteo Renzi", aliases: ["renzi"], alive: true, ideology: 0.08, notoriety: 78, naturalParties: ["italia-viva", "azione-iv"], constraint: "none", record: "Leader di Italia Viva, già segretario del Partito Democratico e Presidente del Consiglio." },
  { id: "silvio-berlusconi", name: "Silvio Berlusconi", aliases: ["berlusconi"], alive: false, died: "2023", ideology: 0.36, notoriety: 96, naturalParties: ["forza-italia"], constraint: "none", record: "Fondatore di Forza Italia e più volte Presidente del Consiglio. Morto nel 2023." },
  { id: "carlo-calenda", name: "Carlo Calenda", aliases: ["calenda"], alive: true, ideology: 0.12, notoriety: 58, naturalParties: ["azione"], constraint: "none", record: "Segretario di Azione." },
  { id: "roberto-vannacci", name: "Roberto Vannacci", aliases: ["vannacci"], alive: true, ideology: 0.78, notoriety: 76, naturalParties: ["futuro-nazionale"], constraint: "none", record: "Presidente di Futuro Nazionale." },
  { id: "ignazio-la-russa", name: "Ignazio La Russa", aliases: ["la russa", "ignazio la russa"], alive: true, ideology: 0.7, notoriety: 64, naturalParties: ["fratelli-ditalia"], constraint: "none", record: "Presidente del Senato, esponente di Fratelli d'Italia." },
  { id: "emma-bonino", name: "Emma Bonino", aliases: ["bonino"], alive: true, ideology: -0.15, notoriety: 60, naturalParties: ["piu-europa"], constraint: "none", record: "Esponente di +Europa, già ministra e commissaria europea." },
  { id: "mario-draghi", name: "Mario Draghi", aliases: ["draghi"], alive: true, ideology: 0.02, notoriety: 86, naturalParties: [], constraint: "none", record: "Già Presidente del Consiglio e presidente della BCE." },
  { id: "enrico-letta", name: "Enrico Letta", aliases: ["letta"], alive: true, ideology: -0.32, notoriety: 55, naturalParties: ["partito-democratico"], constraint: "none", record: "Già segretario del Partito Democratico e Presidente del Consiglio." },
  { id: "beppe-grillo", name: "Beppe Grillo", aliases: ["grillo"], alive: true, ideology: -0.05, notoriety: 70, naturalParties: ["movimento-5-stelle"], constraint: "none", record: "Cofondatore del Movimento 5 Stelle." },
  { id: "donald-trump", name: "Donald Trump", aliases: ["trump"], alive: true, ideology: 0.7, notoriety: 98, naturalParties: [], constraint: "none", record: "Presidente degli Stati Uniti. Figura esterna alla competizione italiana." },
  { id: "elon-musk", name: "Elon Musk", aliases: ["musk", "elon musk"], alive: true, ideology: 0.58, notoriety: 94, naturalParties: [], constraint: "none", record: "Imprenditore, fuori dai partiti italiani." },
  { id: "emmanuel-macron", name: "Emmanuel Macron", aliases: ["macron"], alive: true, ideology: 0.05, notoriety: 80, naturalParties: [], constraint: "none", record: "Presidente della Repubblica francese." },
  { id: "joe-biden", name: "Joe Biden", aliases: ["biden"], alive: true, ideology: -0.2, notoriety: 72, naturalParties: [], constraint: "none", record: "Già presidente degli Stati Uniti." },
  { id: "marine-le-pen", name: "Marine Le Pen", aliases: ["le pen", "lepen"], alive: true, ideology: 0.62, notoriety: 68, naturalParties: [], constraint: "none", record: "Esponente politica francese." },
  { id: "vladimir-putin", name: "Vladimir Putin", aliases: ["putin"], alive: true, ideology: 0.55, notoriety: 90, naturalParties: [], constraint: "authoritarian-foreign", record: "Presidente della Federazione russa. Figura esterna, associata a un sistema autoritario." },
  {
    id: "benito-mussolini",
    name: "Benito Mussolini",
    aliases: ["mussolini", "benito mussolini"],
    alive: false,
    died: "1945",
    ideology: 0.98,
    notoriety: 93,
    naturalParties: [],
    constraint: "fascist-reorganization",
    record: "Capo del governo del Regno d'Italia dal 1922 al 1943, figura del regime fascista sciolto nel 1943. Morto nel 1945.",
  },
  {
    id: "adolf-hitler",
    name: "Adolf Hitler",
    aliases: ["hitler"],
    alive: false,
    died: "1945",
    ideology: 0.98,
    notoriety: 90,
    naturalParties: [],
    constraint: "totalitarian-historical",
    record: "Capo del regime nazionalsocialista tedesco. Morto nel 1945.",
  },
  {
    id: "iosif-stalin",
    name: "Iosif Stalin",
    aliases: ["stalin"],
    alive: false,
    died: "1953",
    ideology: -0.98,
    notoriety: 78,
    naturalParties: [],
    constraint: "totalitarian-historical",
    record: "Capo dell'Unione Sovietica. Morto nel 1953.",
  },
];
