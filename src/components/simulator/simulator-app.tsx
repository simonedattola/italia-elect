"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { ResultsPanel } from "@/components/simulator/results-panel";
import { ScenarioControls } from "@/components/simulator/scenario-controls";
import { assessLeader } from "@/lib/figures/assess";
import { AFFINITY_QUESTIONS, scoreAffinity } from "@/lib/model/affinity";
import { runSimulation } from "@/lib/model/engine";
import { encodeShare, type SharePayload } from "@/lib/model/shareLink";
import {
  COALITION_NAMES,
  initialPayload,
  inputFromPayload,
  listsFor,
  paintRegions,
} from "@/lib/simulator/project";

const LEVELS: { id: SharePayload["level"]; label: string }[] = [
  { id: "nazionali", label: "Politiche" },
  { id: "regionali", label: "Regionali" },
  { id: "comunali", label: "Comunali" },
];

interface MunicipalOption {
  id: string;
  name: string;
  note?: string;
  councilSeats: number;
  lists: { id: string; name: string; color: string; percentage: number; ideology: number }[];
}

interface ExternalContext {
  polls?: { note?: string; shares?: Record<string, number>; quality?: string };
  news?: {
    available: boolean;
    economy: number;
    security: number;
    europe: number;
    costOfLiving: number;
    note: string;
  };
  social?: { available: boolean; score: number; note: string };
}

export function SimulatorApp({ initial }: { initial?: SharePayload }) {
  const [payload, setPayload] = useState<SharePayload>(() => initial ?? initialPayload());
  const [context, setContext] = useState<ExternalContext | null>(null);
  const [pollNote, setPollNote] = useState("La baseline nazionale è la media dei sondaggi pubblicati.");
  const [leaderName, setLeaderName] = useState("");
  const [leaderList, setLeaderList] = useState("partito-democratico");
  const [municipals, setMunicipals] = useState<MunicipalOption[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [shareHref, setShareHref] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      fetch("/api/context")
        .then((response) => response.json())
        .then((body: ExternalContext) => {
          if (cancelled) return;
          setContext(body);
          setPollNote(body.polls?.note ?? "Contesto sondaggi non disponibile.");
        })
        .catch(() => {
          if (!cancelled) setPollNote("Contesto esterno non disponibile. I fattori restano a zero.");
        }),
      fetch("/api/comuni")
        .then((response) => response.json())
        .then((body: { municipalities?: MunicipalOption[] }) => {
          if (!cancelled) setMunicipals(body.municipalities ?? []);
        })
        .catch(() => {
          if (!cancelled) setMunicipals([]);
        }),
    ]).finally(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const municipal = municipals.find((item) => item.id === payload.comuneId) ?? municipals[0];
  const lists = payload.level === "comunali" && municipal ? municipal.lists : listsFor(payload.level, payload.region);
  const waitingMunicipal = payload.level === "comunali" && !municipal;
  const input = useMemo(
    () =>
      inputFromPayload(payload, {
        pollShares: context?.polls?.shares ?? null,
        municipalLists: municipal?.lists,
        municipalCouncil: municipal?.councilSeats,
      }),
    [payload, context, municipal],
  );
  const result = useMemo(() => (waitingMunicipal || input.lists.length === 0 ? null : runSimulation(input)), [input, waitingMunicipal]);
  const regionPaint =
    payload.level === "nazionali" && result
      ? paintRegions(
          Object.fromEntries(result.shares.map((share) => [share.id, share.mean])),
          input.lists.map((list) => ({ ...list, baseline: list.baseline })),
        )
      : undefined;

  function patch(partial: Partial<SharePayload>) {
    setPayload((current) => ({ ...current, ...partial }));
    setShareHref(null);
  }

  function setLevel(level: SharePayload["level"]) {
    const next = initialPayload(level);
    if (level === "comunali" && municipal) next.comuneId = municipal.id;
    setPayload(next);
    setShareHref(null);
  }

  const answered = Object.keys(answers).length > 0;
  const affinity = payload.affinity && answered ? scoreAffinity(payload.affinity.listId, answers) : null;

  return (
    <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
      <form
        className="space-y-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4"
        aria-busy={!ready}
        onSubmit={(event) => {
          event.preventDefault();
          const encoded = encodeShare(payload);
          setShareHref(`/condividi?s=${encoded}`);
        }}
      >
        <fieldset>
          <legend className="text-sm font-semibold">Consultazione</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {LEVELS.map((level) => (
              <button
                key={level.id}
                type="button"
                aria-pressed={payload.level === level.id}
                onClick={() => setLevel(level.id)}
                className={`rounded-lg border px-2 py-2 text-sm ${payload.level === level.id ? "border-[var(--it-blue)] bg-[#0166fe]/20" : "border-[var(--border)]"}`}
              >
                {level.label}
              </button>
            ))}
          </div>
        </fieldset>

        <ScenarioControls
          scenarios={payload.scenarios ?? []}
          lists={lists.map((list) => ({ id: list.id, name: list.name }))}
          onChange={(scenarios) => patch({ scenarios })}
        />

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">Leader</legend>
          <p className="text-xs leading-relaxed text-[var(--muted)]">
            Un nome dell&apos;archivio curato sposta la lista e spiega perché. Un nome sconosciuto resta senza effetto, salvo una lettura automatica se la chiave è configurata.
          </p>
          <input value={leaderName} onChange={(event) => setLeaderName(event.target.value)} placeholder="Nome e cognome" className="w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-2 py-2 text-sm" />
          <select value={leaderList} onChange={(event) => setLeaderList(event.target.value)} className="w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-2 py-2 text-sm">
            {lists.map((list) => (
              <option key={list.id} value={list.id}>{list.name}</option>
            ))}
          </select>
          <button
            type="button"
            className="rounded-md border border-[var(--border)] px-3 py-2 text-sm"
            onClick={() => {
              const list = lists.find((item) => item.id === leaderList);
              const local = assessLeader(leaderName, leaderList, list?.ideology ?? 0);
              const apply = (assessment: typeof local) =>
                patch({
                  leader: assessment.matched
                    ? {
                        name: assessment.displayName,
                        listId: leaderList,
                        swing: assessment.swing,
                        cap: assessment.cap,
                        backlash: assessment.backlash,
                        explanation: assessment.explanation,
                        legalNote: assessment.legalNote,
                      }
                    : undefined,
                });
              if (local.matched) {
                apply(local);
                return;
              }
              void fetch("/api/figure", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ name: leaderName, partyId: leaderList, ideology: list?.ideology ?? 0 }),
              })
                .then((response) => response.json())
                .then((body) => apply(body))
                .catch(() => apply(local));
            }}
          >
            Applica il leader
          </button>
        </fieldset>

        {payload.level === "regionali" ? (
          <label className="block text-sm font-medium">
            Regione con dati 2023
            <select
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-2 py-2"
              value={payload.region}
              onChange={(event) => {
                const region = event.target.value;
                const next = initialPayload("regionali");
                next.region = region;
                setPayload(next);
                setShareHref(null);
              }}
            >
              <option>Lombardia</option>
              <option>Lazio</option>
            </select>
          </label>
        ) : null}

        {payload.level === "comunali" ? (
          <p className="text-sm text-[var(--muted)]">
            {municipal
              ? `Baseline reale: ${municipal.name}. ${municipal.note ?? ""}`
              : "Nel CSV aperto del 28 luglio 2024 non ci sono altri comuni."}
          </p>
        ) : null}

        <Slider label="Incertezza di una lista al 25% (punti percentuali)" min={0} max={4} step={0.1} value={payload.sigma} onChange={(sigma) => patch({ sigma })} />
        <Slider label="Estrazioni Monte Carlo" min={200} max={8000} step={100} value={payload.runs} onChange={(runs) => patch({ runs })} />

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold">Fattori di scenario</legend>
          <Slider label="Economia (positivo = favorevole al governo indicato)" min={-2} max={2} step={0.1} value={payload.factors.economy} onChange={(economy) => patch({ factors: { ...payload.factors, economy } })} />
          <Slider label="Sicurezza" min={-2} max={2} step={0.1} value={payload.factors.security} onChange={(security) => patch({ factors: { ...payload.factors, security } })} />
          <Slider label="Integrazione europea" min={-2} max={2} step={0.1} value={payload.factors.europe} onChange={(europe) => patch({ factors: { ...payload.factors, europe } })} />
          <Slider label="Caro vita" min={0} max={2} step={0.1} value={payload.factors.costOfLiving} onChange={(costOfLiving) => patch({ factors: { ...payload.factors, costOfLiving } })} />
          <Slider label="Clima social (positivo = favorevole al governo indicato)" min={-2} max={2} step={0.1} value={payload.factors.social ?? 0} onChange={(social) => patch({ factors: { ...payload.factors, social } })} />
          <p className="text-xs text-[var(--muted)]">A zero non spostano nulla. Sono elasticità di scenario, non stime ISTAT.</p>
          {context?.news?.note ? <p className="text-xs text-[var(--muted)]">{context.news.note}</p> : null}
          {context?.news?.available ? (
            <button
              type="button"
              className="rounded-md border border-[var(--border)] px-2 py-1 text-xs font-semibold"
              onClick={() =>
                patch({
                  factors: {
                    ...payload.factors,
                    economy: context.news?.economy ?? 0,
                    security: context.news?.security ?? 0,
                    europe: context.news?.europe ?? 0,
                    costOfLiving: context.news?.costOfLiving ?? 0,
                  },
                })
              }
            >
              Applica i fattori della fonte notizie
            </button>
          ) : null}
          {context?.social?.note ? <p className="text-xs text-[var(--muted)]">{context.social.note}</p> : null}
          {context?.social?.available ? (
            <button
              type="button"
              className="rounded-md border border-[var(--border)] px-2 py-1 text-xs font-semibold"
              onClick={() => patch({ factors: { ...payload.factors, social: context.social?.score ?? 0 } })}
            >
              Applica il punteggio social ({context.social.score})
            </button>
          ) : null}
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">Sondaggi</legend>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={payload.usePolls}
              onChange={(event) =>
                patch({
                  usePolls: event.target.checked,
                  pollWeight: event.target.checked && payload.pollWeight === 0 ? 0.35 : payload.pollWeight,
                })
              }
            />
            <span>
              La baseline nazionale è già la media pubblicata. Questa casella la miscela con una fonte esterna, se configurata.
              {pollNote}
            </span>
          </label>
          {payload.usePolls ? (
            <Slider label="Peso della media sondaggi" min={0} max={1} step={0.05} value={payload.pollWeight} onChange={(pollWeight) => patch({ pollWeight })} />
          ) : null}
        </fieldset>

        {payload.level === "nazionali" || payload.level === "regionali" ? (
          <fieldset>
            <legend className="text-sm font-semibold">Coalizioni</legend>
            <div className="mt-2 space-y-2">
              {lists.filter((list) => list.percentage >= 0.8).map((list) => (
                <label key={list.id} className="grid grid-cols-[1fr_auto] items-center gap-2 text-sm">
                  <span className="truncate">{list.name}</span>
                  <select
                    className="rounded-md border border-[var(--border)] bg-[var(--card)] px-1 py-1"
                    value={payload.coalitions[list.id] ?? ""}
                    onChange={(event) =>
                      patch({
                        coalitions: { ...payload.coalitions, [list.id]: event.target.value || null },
                      })
                    }
                  >
                    <option value="">Da sola</option>
                    {COALITION_NAMES.map((id) => (
                      <option key={id} value={id}>
                        {id}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        {payload.level === "regionali" ? (
          <div className="space-y-2">
            <Slider
              label="Seggi del consiglio (parametro, non la legge regionale)"
              min={0}
              max={80}
              step={1}
              value={payload.councilSeats ?? 0}
              onChange={(councilSeats) => patch({ councilSeats })}
            />
            <Slider
              label="Seggi di premio"
              min={0}
              max={20}
              step={1}
              value={payload.regionalBonusSeats ?? 0}
              onChange={(regionalBonusSeats) => patch({ regionalBonusSeats })}
            />
            {(payload.regionalBonusSeats ?? 0) > 0 ? (
              <label className="block text-sm font-medium">
                Coalizione che riceve il premio
                <select
                  className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-2 py-2"
                  value={payload.bonusCoalitionId ?? ""}
                  onChange={(event) => patch({ bonusCoalitionId: event.target.value || null })}
                >
                  <option value="">Nessuna: i seggi di premio restano fuori dal riparto</option>
                  {COALITION_NAMES.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        ) : null}

        <details className="rounded-lg border border-[var(--border)] p-3">
          <summary className="cursor-pointer text-sm font-semibold">Candidato di una lista reale</summary>
          <div className="mt-3 space-y-3">
            <label className="block text-sm">
              Lista
              <select
                className="mt-1 w-full rounded-md border border-[var(--border)] px-2 py-2"
                value={payload.affinity?.listId ?? ""}
                onChange={(event) => {
                  const listId = event.target.value;
                  if (!listId) patch({ affinity: undefined });
                  else patch({ affinity: { listId, score: affinity?.score ?? 50, notoriety: payload.affinity?.notoriety ?? 40 } });
                }}
              >
                <option value="">Nessun candidato</option>
                {lists.filter((list) => list.percentage >= 1).map((list) => (
                  <option key={list.id} value={list.id}>{list.name}</option>
                ))}
              </select>
            </label>
            {payload.affinity ? (
              <>
                {AFFINITY_QUESTIONS.map((question) => (
                  <Slider
                    key={question.id}
                    label={`${question.theme}: ${question.leftLabel} ↔ ${question.rightLabel}`}
                    min={-1}
                    max={1}
                    step={0.1}
                    value={answers[question.id] ?? 0}
                    onChange={(value) => {
                      const next = { ...answers, [question.id]: value };
                      setAnswers(next);
                      const scored = scoreAffinity(payload.affinity!.listId, next);
                      patch({ affinity: { ...payload.affinity!, score: scored.score } });
                    }}
                  />
                ))}
                <Slider
                  label="Notorietà del candidato"
                  min={0}
                  max={100}
                  step={1}
                  value={payload.affinity.notoriety}
                  onChange={(notoriety) => patch({ affinity: { ...payload.affinity!, notoriety } })}
                />
                <p className="text-sm">
                  Affinità {payload.affinity.score}/100. {affinity?.note ?? "Il punteggio resta quello salvato finché non muovi le risposte."}
                </p>
              </>
            ) : null}
          </div>
        </details>

        <details className="rounded-lg border border-[var(--border)] p-3">
          <summary className="cursor-pointer text-sm font-semibold">Lista ipotetica</summary>
          <div className="mt-3 space-y-3">
            <label className="block text-sm">
              Nome
              <input
                className="mt-1 w-full rounded-md border border-[var(--border)] px-2 py-2"
                value={payload.customParty?.name ?? ""}
                onChange={(event) =>
                  patch({
                    customParty: {
                      name: event.target.value,
                      color: payload.customParty?.color ?? "#7c3aed",
                      target: payload.customParty?.target ?? 4,
                      ideology: payload.customParty?.ideology ?? 0,
                    },
                  })
                }
              />
            </label>
            {payload.customParty?.name ? (
              <>
                <label className="block text-sm">
                  Colore
                  <input
                    type="color"
                    className="mt-1 h-10 w-full"
                    value={payload.customParty.color}
                    onChange={(event) => patch({ customParty: { ...payload.customParty!, color: event.target.value } })}
                  />
                </label>
                <Slider label="Consenso di partenza" min={0} max={20} step={0.5} value={payload.customParty.target} onChange={(target) => patch({ customParty: { ...payload.customParty!, target } })} />
                <Slider label="Asse sinistra-destra" min={-1} max={1} step={0.05} value={payload.customParty.ideology} onChange={(ideology) => patch({ customParty: { ...payload.customParty!, ideology } })} />
                <label className="block text-sm">
                  Descrizione
                  <textarea
                    maxLength={400}
                    className="mt-1 w-full rounded-md border border-[var(--border)] px-2 py-2"
                    value={payload.customParty.description ?? ""}
                    onChange={(event) => patch({ customParty: { ...payload.customParty!, description: event.target.value } })}
                  />
                </label>
                <label className="block text-sm">
                  Candidati
                  <input
                    maxLength={200}
                    className="mt-1 w-full rounded-md border border-[var(--border)] px-2 py-2"
                    value={payload.customParty.candidates ?? ""}
                    onChange={(event) => patch({ customParty: { ...payload.customParty!, candidates: event.target.value } })}
                  />
                </label>
                <p className="text-xs text-[var(--muted)]">
                  Testo e candidati restano nella scheda condivisa. I voti si spostano solo con il consenso di partenza e l&apos;asse.
                </p>
              </>
            ) : null}
          </div>
        </details>

        <button type="submit" className="w-full rounded-lg bg-[var(--it-blue)] px-4 py-2.5 text-sm font-semibold text-white">
          Crea link da condividere
        </button>
        {shareHref ? (
          <p className="text-sm">
            <Link className="font-semibold text-[var(--it-blue)] underline" href={shareHref}>
              Apri la simulazione condivisa
            </Link>
          </p>
        ) : null}
        {!ready ? <p className="text-sm text-[var(--muted)]">Caricamento del contesto.</p> : null}
      </form>

      <div aria-live="polite">
        <p className="mb-4 text-sm text-[var(--muted)]">
          Baseline {payload.baselineId}. I fattori a zero lasciano i voti ufficiali, più il solo rumore Monte Carlo.
          {payload.level === "nazionali"
            ? " I collegi della Valle d'Aosta e l'Estero non sono nella stima uninominale."
            : ""}
        </p>
        {payload.customParty?.name ? (
          <p className="mb-4 text-sm">
            <strong>{payload.customParty.name}</strong>
            {payload.customParty.candidates ? ` · ${payload.customParty.candidates}` : ""}
            {payload.customParty.description ? ` — ${payload.customParty.description}` : ""}
          </p>
        ) : null}
        {result ? (
          <ResultsPanel result={result} regionPaint={regionPaint} />
        ) : (
          <p className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-sm">
            {waitingMunicipal
              ? "In attesa del comune presente nell'archivio aperto."
              : "Non ci sono liste da simulare su questa baseline."}
          </p>
        )}
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className="block text-sm">
      <span className="flex justify-between gap-3">
        <span>{label}</span>
        <span className="tabular-nums text-[var(--muted)]">{value}</span>
      </span>
      <input
        id={id}
        className="mt-1 w-full accent-[var(--it-blue)]"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
