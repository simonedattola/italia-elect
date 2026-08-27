"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PARTIES } from "@/lib/electoral/parties";
import {
  createSimulation,
  type ConfirmationOption,
} from "@/actions/simulate";
import { ScenarioEditor } from "@/components/simulation/ScenarioEditor";
import {
  DEFAULT_UI_SCENARIO,
  type UiScenarioConfig,
} from "@/types/scenario";

export function SimulationForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    partySlug: "fratelli-ditalia",
    description: "",
    program: "",
    photoUrl: "",
  });
  const [scenario, setScenario] = useState<UiScenarioConfig>(DEFAULT_UI_SCENARIO);
  const [confirmation, setConfirmation] = useState<{
    prompt: string;
    options: ConfirmationOption[];
  } | null>(null);

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
        ...form,
        photoUrl: form.photoUrl || undefined,
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
          toast.message("Conferma l'identità del candidato");
          return;
        }
        toast.error(res.error);
        return;
      }
      toast.success(
        scenario.uiMode === "fun"
          ? "Simulazione Amici completata"
          : "Simulazione analista completata",
      );
      router.push(`/risultati/${res.slug}`);
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    run();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="space-y-6"
    >
      <Card className="border-[var(--border)] shadow-md">
        <CardHeader>
          <CardTitle className="font-[family-name:var(--font-display)] text-2xl">
            Nuova simulazione
          </CardTitle>
          <CardDescription>
            Motore ibrido MRP+ABM con Scenario Editor: prior realistici e shock
            comportamentali. Entity resolution sulle figure pubbliche.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-5" id="simulate-form">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="candidate-name">Nome</Label>
                <Input
                  id="candidate-name"
                  required
                  value={form.firstName}
                  onChange={(e) => update("firstName", e.target.value)}
                  placeholder="es. Giorgia"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Cognome</Label>
                <Input
                  id="lastName"
                  required
                  value={form.lastName}
                  onChange={(e) => update("lastName", e.target.value)}
                  placeholder="es. Meloni"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="party">Partito politico</Label>
              <select
                id="party"
                className="flex h-10 w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm"
                value={form.partySlug}
                onChange={(e) => update("partySlug", e.target.value)}
              >
                {PARTIES.filter((p) => p.slug !== "italexit").map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrizione del candidato</Label>
              <Textarea
                id="description"
                required
                minLength={20}
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Biografia, competenze, posizionamento politico…"
                className="min-h-[120px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="program">Programma elettorale (facoltativo)</Label>
              <Textarea
                id="program"
                value={form.program}
                onChange={(e) => update("program", e.target.value)}
                placeholder="Punti chiave del programma…"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="photo">URL foto (facoltativo)</Label>
              <Input
                id="photo"
                type="url"
                value={form.photoUrl}
                onChange={(e) => update("photoUrl", e.target.value)}
                placeholder="https://…"
              />
            </div>

            <ScenarioEditor value={scenario} onChange={setScenario} />

            {confirmation && (
              <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
                <p className="text-sm font-medium text-[var(--foreground)]">
                  {confirmation.prompt}
                </p>
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
                        className="w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-left text-sm transition hover:border-[var(--accent)]"
                      >
                        <span className="font-medium">{opt.label}</span>
                        <span className="mt-0.5 block text-xs text-[var(--muted)]">
                          {opt.description || "Senza descrizione"} · confidenza{" "}
                          {opt.confidence}% · {opt.roleCategory}
                        </span>
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
                  Non è nessuna di queste — procedi come sconosciuto
                </Button>
              </div>
            )}

            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-xs text-[var(--muted)]">
              Italia Elect è un{" "}
              <strong className="text-[var(--foreground)]">simulatore statistico</strong>
              {" "}ibrido MRP+ABM, non uno strumento di previsione certa.
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full sm:w-auto"
              disabled={pending}
              id="simulate"
            >
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Elaborazione Monte Carlo…
                </>
              ) : scenario.uiMode === "fun" ? (
                "Simula (modalità Amici)"
              ) : (
                "Avvia simulazione nazionale"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
