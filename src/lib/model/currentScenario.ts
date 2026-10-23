import published from "@/data/polls/published.json";
import { colorForList, ideologyForList } from "@/lib/electoral/canonical";
import { aggregatePolls, type PollRecord } from "./aggregatePolls";

const NAMES: Record<string, string> = {
  "fratelli-ditalia": "Fratelli d'Italia",
  "partito-democratico": "Partito Democratico",
  "movimento-5-stelle": "Movimento 5 Stelle",
  lega: "Lega",
  "forza-italia": "Forza Italia",
  azione: "Azione",
  "italia-viva": "Italia Viva",
  avss: "Alleanza Verdi e Sinistra",
  "piu-europa": "+Europa",
  "noi-moderati": "Noi Moderati",
  "futuro-nazionale": "Futuro Nazionale",
  "sud-chiama-nord": "Sud chiama Nord",
  pld: "Partito Liberaldemocratico",
  ora: "Ora!",
  psi: "PSI",
  pci: "Progetto Civico",
  "piu-uno": "+U",
};

export interface CurrentList {
  id: string;
  name: string;
  color: string;
  percentage: number;
  ideology: number;
}

interface PublishedFile {
  sourceUrl: string;
  retrievedAt: string;
  note: string;
  coalitionSpreadSd: number | null;
  polls: PollRecord[];
}

const file = published as unknown as PublishedFile;

export function publishedPollRecords(): PollRecord[] {
  return file.polls;
}

export function currentPollAggregate(now = Date.parse(`${file.retrievedAt}T12:00:00Z`)) {
  return aggregatePolls(file.polls, now);
}

export function currentPollMeta() {
  return {
    sourceUrl: file.sourceUrl,
    retrievedAt: file.retrievedAt,
    note: file.note,
    coalitionSpreadSd: file.coalitionSpreadSd,
    pollCount: file.polls.length,
  };
}

/** Quote di lista sopra lo 0,8%, così ogni lista intorno all'1% nella media entra nello scenario. */
export function currentNationalLists(now = Date.parse(`${file.retrievedAt}T12:00:00Z`)): CurrentList[] {
  const aggregate = currentPollAggregate(now);
  return Object.entries(aggregate.shares)
    .filter(([, share]) => share >= 0.8)
    .map(([id, percentage]) => ({
      id,
      name: NAMES[id] ?? id,
      color: colorForList(id),
      percentage,
      ideology: ideologyForList(id),
    }))
    .sort((a, b) => b.percentage - a.percentage);
}

/**
 * Scarto fra coalizioni nella finestra di sondaggi, in punti.
 * È la dispersione fra istituti, non l'errore storico di un backtest.
 */
export function defaultCommonShockSd(): number {
  const spread = file.coalitionSpreadSd;
  if (spread == null || !Number.isFinite(spread)) return 2.2;
  return Math.max(2.2, spread);
}
