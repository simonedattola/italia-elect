import referendum from "@/data/generated/eligendo-referendum.json";

interface Question {
  id: string;
  date: string;
  title: string;
  nationalYes: number | null;
  regions: Record<string, number | null>;
}

const QUESTIONS = (referendum as { questions: Question[] }).questions;

/** Media, in punti, del Sì regionale meno il Sì nazionale sui quesiti in archivio. */
export function regionalYesGap(region: string): { gap: number; questions: number } | null {
  let sum = 0;
  let count = 0;
  for (const question of QUESTIONS) {
    const local = question.regions[region];
    if (local == null || question.nationalYes == null) continue;
    sum += local - question.nationalYes;
    count += 1;
  }
  if (count === 0) return null;
  return { gap: sum / count, questions: count };
}

/**
 * Scala leggermente uno scenario regionale nelle regioni che, nei referendum,
 * si scostano di più dal risultato nazionale. Resta entro +20% e non supera i tetti di lista.
 */
export function regionalPriorScale(region: string | undefined): number {
  if (!region) return 1;
  const stat = regionalYesGap(region);
  if (!stat) return 1;
  return 1 + Math.min(0.2, Math.abs(stat.gap) / 40);
}

export function referendumQuestionCount(): number {
  return QUESTIONS.length;
}
