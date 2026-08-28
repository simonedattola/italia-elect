/** Sentiment locale euristico (no BERT cloud a pagamento). */
export function analyzeSentiment(text: string): number {
  const lower = text.toLowerCase();
  const positive = ["vittoria", "crescita", "fiducia", "italia", "futuro", "sicurezza"];
  const negative = ["crisi", "fallimento", "corruzione", "aumento", "scandalo", "protesta"];
  let score = 0;
  for (const w of positive) if (lower.includes(w)) score += 0.15;
  for (const w of negative) if (lower.includes(w)) score -= 0.15;
  return Math.max(-1, Math.min(1, score));
}
