/**
 * Media di sondaggi con peso di recenza, ampiezza campionaria e affidabilità.
 * La correzione di house effect si applica solo se il record la dichiara:
 * non viene stimata d'ufficio.
 */

export interface PollRecord {
  id: string;
  institute: string;
  publishedAt: string;
  sampleSize?: number;
  reliability?: number;
  shares: Record<string, number>;
  /** Punti percentuali da sottrarre prima della media, se l'istituto pubblica uno scostamento. */
  houseEffect?: Record<string, number>;
  sourceUrl?: string;
  /** illustrative: serie dimostrativa, non una rilevazione citabile. */
  quality?: "illustrative" | "published" | "live";
}

export interface PollAggregate {
  asOf: string;
  shares: Record<string, number>;
  pollCount: number;
  institutes: string[];
  quality: "empty" | "illustrative" | "published" | "live" | "mixed";
  note: string;
}

export function pollWeight(poll: PollRecord, now = Date.now(), halfLifeDays = 21): number {
  const ageDays = Math.max(0, (now - new Date(poll.publishedAt).getTime()) / 86_400_000);
  const freshness = Math.exp(-ageDays / halfLifeDays);
  const sample = Math.sqrt(Math.min(poll.sampleSize ?? 800, 8000) / 1000);
  const reliability = poll.reliability ?? 0.7;
  return Math.max(0.02, freshness * sample * reliability);
}

export function aggregatePolls(polls: PollRecord[], now = Date.now()): PollAggregate {
  const usable = polls.filter((p) => Object.keys(p.shares).length > 0);
  if (usable.length === 0) {
    return {
      asOf: new Date(now).toISOString(),
      shares: {},
      pollCount: 0,
      institutes: [],
      quality: "empty",
      note: "Nessun sondaggio in ingresso.",
    };
  }
  const acc = new Map<string, number>();
  const weightSum = new Map<string, number>();
  for (const poll of usable) {
    const w = pollWeight(poll, now);
    for (const [id, raw] of Object.entries(poll.shares)) {
      const corrected = raw - (poll.houseEffect?.[id] ?? 0);
      acc.set(id, (acc.get(id) ?? 0) + corrected * w);
      weightSum.set(id, (weightSum.get(id) ?? 0) + w);
    }
  }
  const shares: Record<string, number> = {};
  for (const [id, sum] of acc) {
    const denom = weightSum.get(id) || 1;
    shares[id] = sum / denom;
  }
  const total = Object.values(shares).reduce((a, b) => a + b, 0) || 1;
  for (const id of Object.keys(shares)) shares[id] = (shares[id] / total) * 100;

  const qualities = new Set(usable.map((p) => p.quality ?? "published"));
  let quality: PollAggregate["quality"] = "published";
  if (qualities.size > 1) quality = "mixed";
  else if (qualities.has("illustrative")) quality = "illustrative";
  else if (qualities.has("live")) quality = "live";

  return {
    asOf: new Date(now).toISOString(),
    shares,
    pollCount: usable.length,
    institutes: [...new Set(usable.map((p) => p.institute))],
    quality,
    note:
      quality === "illustrative"
        ? "Serie dimostrativa incorporata: non è una media di sondaggi pubblicati. Va attivata a mano."
        : `Media di ${usable.length} sondaggi. Peso: recenza (emivita 21 giorni), radice del campione, affidabilità. House effect solo se dichiarato dal record.`,
  };
}
