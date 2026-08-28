"use client";

import { THEME_QUESTIONS } from "@/lib/game/themeQuestions";
import { ideologyFromCustomProfile, partyColorFromIdeology } from "@/lib/game/themeQuestions";
import { ideologyLabelFromScore } from "@/lib/game/ideologyLabels";
import type { PlayerFormState } from "@/lib/game/types";
import { Label } from "@/components/ui/input";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface CustomPartyBuilderProps {
  form: PlayerFormState;
  onChange: (patch: Partial<PlayerFormState>) => void;
}

export function CustomPartyBuilder({ form, onChange }: CustomPartyBuilderProps) {
  const { ideologyScore } = ideologyFromCustomProfile(
    form.economicAxis,
    form.socialAxis,
    form.themeAnswers,
  );
  const color = partyColorFromIdeology(ideologyScore);

  function setAnswer(id: string, value: string | number | boolean) {
    onChange({ themeAnswers: { ...form.themeAnswers, [id]: value } });
  }

  return (
    <div className="mt-4 space-y-5 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Crea il tuo partito</h4>
        <span
          className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
          style={{ backgroundColor: color }}
        >
          {ideologyLabelFromScore(ideologyScore)}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor={`custom-name-${form.id}`}>Nome partito</Label>
          <Input
            id={`custom-name-${form.id}`}
            value={form.customPartyName}
            onChange={(e) => onChange({ customPartyName: e.target.value })}
            placeholder="Es. Partito del Futuro"
          />
        </div>
        <div>
          <Label htmlFor={`custom-motto-${form.id}`}>Motto</Label>
          <Input
            id={`custom-motto-${form.id}`}
            value={form.customMotto}
            onChange={(e) => onChange({ customMotto: e.target.value })}
            placeholder="Es. Insieme per l'Italia"
          />
        </div>
      </div>

      <div>
        <Label>Posizionamento politico (XY)</Label>
        <p className="mb-2 text-xs text-[var(--muted)]">
          Asse orizzontale: sinistra ↔ destra · Asse verticale: libertario ↔ autoritario
        </p>
        <div className="relative mx-auto h-48 w-full max-w-xs rounded-lg border border-[var(--border)] bg-[var(--card)]">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-px w-full bg-[var(--border)]" />
            <div className="absolute h-full w-px bg-[var(--border)]" />
          </div>
          <span className="absolute left-1 top-1 text-[9px] text-[var(--muted)]">Autoritario</span>
          <span className="absolute bottom-1 left-1 text-[9px] text-[var(--muted)]">Sinistra</span>
          <span className="absolute bottom-1 right-1 text-[9px] text-[var(--muted)]">Destra</span>
          <span className="absolute right-1 top-1 text-[9px] text-[var(--muted)]">Libertario</span>
          <div
            className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-lg"
            style={{
              backgroundColor: color,
              left: `${((form.economicAxis + 1) / 2) * 100}%`,
              top: `${((1 - form.socialAxis) / 2) * 100}%`,
            }}
          />
          <input
            type="range"
            min={-1}
            max={1}
            step={0.05}
            value={form.economicAxis}
            onChange={(e) => onChange({ economicAxis: parseFloat(e.target.value) })}
            className="absolute bottom-2 left-2 right-2 w-[calc(100%-1rem)] accent-[var(--it-blue)]"
            aria-label="Asse sinistra-destra"
          />
          <input
            type="range"
            min={-1}
            max={1}
            step={0.05}
            value={form.socialAxis}
            onChange={(e) => onChange({ socialAxis: parseFloat(e.target.value) })}
            className="absolute left-2 top-1/2 w-[calc(100%-1rem)] -translate-y-1/2 rotate-[-90deg] accent-[var(--it-blue)]"
            aria-label="Asse libertario-autoritario"
          />
        </div>
      </div>

      <div className="space-y-4">
        <Label>Temi ({THEME_QUESTIONS.length} domande)</Label>
        {THEME_QUESTIONS.map((q) => (
          <div key={q.id} className="rounded-md border border-[var(--border)] bg-[var(--card)] p-3">
            <p className="text-xs font-medium text-[var(--muted)]">{q.theme}</p>
            <p className="mt-1 text-sm">{q.label}</p>
            {q.type === "yesno" && (
              <div className="mt-2 flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={form.themeAnswers[q.id] === true ? "default" : "outline"}
                  onClick={() => setAnswer(q.id, true)}
                >
                  Sì
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={form.themeAnswers[q.id] === false ? "default" : "outline"}
                  onClick={() => setAnswer(q.id, false)}
                >
                  No
                </Button>
              </div>
            )}
            {q.type === "scale" && (
              <div className="mt-2">
                <input
                  type="range"
                  min={q.min ?? 1}
                  max={q.max ?? 5}
                  step={1}
                  value={(form.themeAnswers[q.id] as number) ?? 3}
                  onChange={(e) => setAnswer(q.id, parseInt(e.target.value, 10))}
                  className="w-full accent-[var(--it-blue)]"
                />
                <div className="flex justify-between text-[10px] text-[var(--muted)]">
                  <span>{q.labels?.[0]}</span>
                  <span>{(form.themeAnswers[q.id] as number) ?? 3}</span>
                  <span>{q.labels?.[1]}</span>
                </div>
              </div>
            )}
            {q.type === "choice" && q.options && (
              <div className="mt-2 flex flex-wrap gap-2">
                {q.options.map((opt) => (
                  <Button
                    key={opt}
                    type="button"
                    size="sm"
                    variant={form.themeAnswers[q.id] === opt ? "default" : "outline"}
                    onClick={() => setAnswer(q.id, opt)}
                  >
                    {opt}
                  </Button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
