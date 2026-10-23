import embeddedPolls from "@/data/polls/polls.json";
import { aggregatePolls, type PollAggregate, type PollRecord } from "./aggregatePolls";

interface EmbeddedFile {
  note?: string;
  polls?: Array<{
    id: string;
    publishedAt: string;
    institute: string;
    sampleSize?: number;
    shares: Record<string, number>;
  }>;
}

/**
 * Sorgente sondaggi sostituibile.
 * POLLS_JSON_URL può puntare a un JSON `{ polls: PollRecord[] }`.
 * Senza URL si usa la serie dimostrativa già nel repository, marcata come tale.
 */
export async function loadPollContext(now = Date.now()): Promise<{
  aggregate: PollAggregate;
  records: PollRecord[];
}> {
  const url = process.env.POLLS_JSON_URL;
  if (url) {
    try {
      const headers: Record<string, string> = { accept: "application/json" };
      if (process.env.POLLS_API_KEY) headers.authorization = `Bearer ${process.env.POLLS_API_KEY}`;
      const response = await fetch(url, { headers, next: { revalidate: 3600 } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = (await response.json()) as { polls?: PollRecord[] };
      const records = (body.polls ?? []).map((p) => ({ ...p, quality: p.quality ?? "live" }));
      return { records, aggregate: aggregatePolls(records, now) };
    } catch (error) {
      const reason = error instanceof Error ? error.message : "errore di rete";
      const fallback = illustrativeRecords();
      const aggregate = aggregatePolls(fallback, now);
      aggregate.note = `La fonte POLLS_JSON_URL non ha risposto (${reason}). Resto sulla serie dimostrativa, che non è una media pubblicata.`;
      return { records: fallback, aggregate };
    }
  }
  const records = illustrativeRecords();
  return { records, aggregate: aggregatePolls(records, now) };
}

function illustrativeRecords(): PollRecord[] {
  const file = embeddedPolls as EmbeddedFile;
  return (file.polls ?? []).map((p) => ({
    id: p.id,
    institute: p.institute,
    publishedAt: p.publishedAt,
    sampleSize: p.sampleSize,
    reliability: 0.55,
    shares: p.shares,
    quality: "illustrative" as const,
  }));
}

export interface ExternalFactorReading {
  available: boolean;
  economy: number;
  security: number;
  europe: number;
  costOfLiving: number;
  note: string;
}

/**
 * Adattatore notizie / attualità.
 * Il JSON atteso è `{ economy, security, europe, costOfLiving }` su scala -2…+2.
 * Senza NEWS_API_URL i fattori restano quelli scelti nell'interfaccia (default 0).
 */
export async function loadNewsFactors(): Promise<ExternalFactorReading> {
  const url = process.env.NEWS_API_URL;
  if (!url) {
    return {
      available: false,
      economy: 0,
      security: 0,
      europe: 0,
      costOfLiving: 0,
      note: "Nessuna fonte notizie configurata. I fattori restano a zero finché non li muovi.",
    };
  }
  try {
    const headers: Record<string, string> = { accept: "application/json" };
    if (process.env.NEWS_API_KEY) headers.authorization = `Bearer ${process.env.NEWS_API_KEY}`;
    const response = await fetch(url, { headers, next: { revalidate: 1800 } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = (await response.json()) as Partial<ExternalFactorReading>;
    return {
      available: true,
      economy: clampFactor(body.economy),
      security: clampFactor(body.security),
      europe: clampFactor(body.europe),
      costOfLiving: clampFactor(body.costOfLiving),
      note: "Fattori letti da NEWS_API_URL. Sono un input esterno, non una misura ufficiale ISTAT.",
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "errore";
    return {
      available: false,
      economy: 0,
      security: 0,
      europe: 0,
      costOfLiving: 0,
      note: `NEWS_API_URL non disponibile (${reason}). Fattori a zero.`,
    };
  }
}

export interface SocialReading {
  available: boolean;
  /** -1…+1, positivo = clima favorevole all'esecutivo. */
  score: number;
  note: string;
}

/**
 * Adattatore di sentiment. JSON atteso: `{ score: number }` fra -1 e 1.
 * Non c'è un punteggio di riserva inventato.
 */
export async function loadSocialSentiment(): Promise<SocialReading> {
  const url = process.env.SOCIAL_API_URL;
  if (!url) {
    return {
      available: false,
      score: 0,
      note: "Nessuna fonte social configurata. Il cursore resta a zero, cioè nessun effetto.",
    };
  }
  try {
    const headers: Record<string, string> = { accept: "application/json" };
    if (process.env.SOCIAL_API_KEY) headers.authorization = `Bearer ${process.env.SOCIAL_API_KEY}`;
    const response = await fetch(url, { headers, next: { revalidate: 1800 } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = (await response.json()) as { score?: number };
    return {
      available: true,
      score: Math.max(-1, Math.min(1, body.score ?? 0)),
      note: "Sentiment letto da SOCIAL_API_URL.",
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "errore";
    return {
      available: false,
      score: 0,
      note: `SOCIAL_API_URL non disponibile (${reason}). Nessun sentiment imputato.`,
    };
  }
}

function clampFactor(value: unknown): number {
  const n = typeof value === "number" ? value : 0;
  return Math.max(-2, Math.min(2, n));
}
