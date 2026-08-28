"use client";

import Link from "next/link";
import { useMemo, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createSimulation,
  type ConfirmationOption,
} from "@/actions/simulate";
import { ScenarioEditor } from "@/components/simulation/ScenarioEditor";
import { BaselinePreview } from "@/components/simulation/BaselinePreview";
import {
  DEFAULT_UI_SCENARIO,
  type UiScenarioConfig,
} from "@/types/scenario";
import { RANDOM_SCENARIO_SESSION_KEY } from "@/lib/experiences/randomScenarioHandoff";

export type UiParty = {
  slug: string;
  name: string;
  shortName: string;
  color: string;
  aiDetected: boolean;
  isCustom?: boolean;
};

function splitFullName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export function SimulationForm({ parties }: { parties: UiParty[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [fullName, setFullName] = useState("");
  const [form, setForm] = useState({
    partySlug: "fratelli-ditalia",
    description: "",
    program: "",
  });
  const [scenario, setScenario] = useState<UiScenarioConfig>(DEFAULT_UI_SCENARIO);
  const [confirmation, setConfirmation] = useState<{
    prompt: string;
    options: ConfirmationOption[];
  } | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(RANDOM_SCENARIO_SESSION_KEY);
      if (!raw) return;
      const handoff = JSON.parse(raw) as {
        title?: string;
        partyVoteAdjustments?: Record<string, number>;
      };
      sessionStorage.removeItem(RANDOM_SCENARIO_SESSION_KEY);
      if (handoff.partyVoteAdjustments) {
        setScenario((s) => ({
          ...s,
          partyVoteAdjustments: {
            ...s.partyVoteAdjustments,
            ...handoff.partyVoteAdjustments,
          },
        }));
        toast.success(
          handoff.title
            ? `Scenario «${handoff.title}» applicato agli aggiustamenti di voto`
            : "Scenario casuale applicato",
        );
      }
    } catch {
      sessionStorage.removeItem(RANDOM_SCENARIO_SESSION_KEY);
    }
  }, []);

  const { firstName, lastName } = useMemo(() => splitFullName(fullName), [fullName]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setConfirmation(null);
  }

  function run(extra?: {
    confirmedWikidataId?: string;
    proceedAsUnknown?: boolean;
  }) {
    startTransition(async () => {
      const res = await createSimulation({
        firstName,
        lastName,
        partySlug: form.partySlug,
        description: form.description,
        program: form.program || undefined,
        confirmedWikidataId: extra?.confirmedWikidataId,
        proceedAsUnknown: extra?.proceedAsUnknown,
        scenario,
      });
      if (!res.ok) {
        if (res.needsConfirmation && res.options?.length) {
          setConfirmation({
            prompt: res.prompt ?? res.error,
            options: res.options,
          });
          return;
        }
        toast.error(res.error);
        return;
      }
      router.push(`/risultati/${res.slug}`);
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    run();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-10">
      <div className="glass space-y-6 rounded-2xl p-5 sm:p-6">
        <header>
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
            Analista
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
            Configura candidato
          </h1>
        </header>

        <form onSubmit={onSubmit} className="space-y-5" id="simulate-form">
          <div className="space-y-2">
            <Label htmlFor="fullName">Nome e cognome</Label>
            <Input
              id="fullName"
              required
              placeholder="es. Giorgia Meloni"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                setConfirmation(null);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="party">Partito</Label>
            <Select
              value={form.partySlug}
              onValueChange={(v) => update("partySlug", v)}
            >
              <SelectTrigger id="party">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {parties.map((p) => (
                  <SelectItem key={p.slug} value={p.slug}>
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: p.color }}
                      />
                      {p.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Link
              href="/crea-partito"
              className="text-xs text-[var(--it-blue)] hover:underline"
            >
              + Partito
            </Link>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrizione</Label>
            <Textarea
              id="description"
              required
              minLength={20}
              placeholder="Biografia, posizioni, carriera — influenza compatibilità e risultato"
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="program">Programma</Label>
            <Textarea
              id="program"
              placeholder="Punti programmatici, riforme, priorità — modula mobilizzazione e appeal"
              value={form.program}
              onChange={(e) => update("program", e.target.value)}
              className="min-h-[88px]"
            />
          </div>

          <ScenarioEditor
            value={scenario}
            onChange={setScenario}
            collapsed
            parties={parties}
          />

          {confirmation && (
            <div className="space-y-3 rounded-xl border border-[var(--border)] bg-black/25 p-4">
              <p className="text-sm font-medium text-white">{confirmation.prompt}</p>
              <ul className="space-y-2">
                {confirmation.options.map((opt) => (
                  <li key={opt.wikidataId ?? opt.label}>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        opt.wikidataId
                          ? run({ confirmedWikidataId: opt.wikidataId })
                          : undefined
                      }
                      className="w-full rounded-xl border border-[var(--border)] bg-white/[0.03] px-3 py-2 text-left text-sm transition hover:border-[var(--it-blue)]/50"
                    >
                      {opt.label}
                    </button>
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => run({ proceedAsUnknown: true })}
              >
                Procedi
              </Button>
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            variant="gradient"
            className="glow-button-blue w-full"
            disabled={pending}
            id="simulate"
          >
            {pending ? "Simulazione in corso…" : "Avvia simulazione"}
          </Button>
        </form>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
          Preview live
        </p>
        <BaselinePreview
          partySlug={form.partySlug}
          scenario={scenario}
          candidate={{
            firstName,
            lastName,
            description: form.description,
            program: form.program,
          }}
        />
      </aside>
    </div>
  );
}
