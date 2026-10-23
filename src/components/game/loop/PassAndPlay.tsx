"use client";

import { useEffect, useMemo, useState } from "react";
import { REGION_NAMES } from "@/lib/electoral/canonical";
import { currentNationalLists } from "@/lib/model/currentScenario";
import { drawScenario } from "@/lib/scenarios/library";
import type { ScenarioInput } from "@/lib/scenarios/types";
import type { ContestResult } from "@/lib/game/contest";

type ModeId = "ballottaggio" | "regionale" | "nazionali" | "duello" | "draft";
type Step = "mode" | "territory" | "p1" | "handoff" | "p2" | "round-handoff" | "round" | "night" | "result";

const MODES: { id: ModeId; index: string; title: string; text: string; level: "comunali" | "regionali" | "nazionali" }[] = [
  { id: "ballottaggio", index: "01", title: "Ballottaggio", text: "Due candidati, un comune. Chi prende più voti vince il testa a testa.", level: "comunali" },
  { id: "regionale", index: "02", title: "Regione", text: "Due liste nella stessa regione. Il consiglio è un modello parametrico.", level: "regionali" },
  { id: "nazionali", index: "03", title: "Coalizioni", text: "Politiche nazionali. Ogni giocatore guida una lista dentro il campo reale.", level: "nazionali" },
  { id: "duello", index: "04", title: "Duello a turni", text: "Tre temi, a turno e a tempo. L'altro non vede la risposta.", level: "nazionali" },
  { id: "draft", index: "05", title: "Draft rapido", text: "Si sceglie una lista e un nome. Poi si va dritti allo spoglio.", level: "nazionali" },
];

const CITIES = ["Roma", "Milano", "Napoli", "Torino", "Palermo", "Bologna", "Firenze", "Genova", "Bari", "Catania"];
const THEMES = [
  { id: "migration", label: "Confini e accoglienza" },
  { id: "economy", label: "Tasse o welfare" },
  { id: "security", label: "Sicurezza" },
];

interface Draft {
  displayName: string;
  partyId: string;
  partyName: string;
  color: string;
  ideology: number;
  candidateName: string;
  custom: boolean;
}

const emptyDraft = (): Draft => ({
  displayName: "",
  partyId: "partito-democratico",
  partyName: "Partito Democratico",
  color: "#E31C2B",
  ideology: -0.35,
  candidateName: "",
  custom: false,
});

function partyFromId(id: string): Draft {
  const list = currentNationalLists().find((item) => item.id === id);
  return {
    ...emptyDraft(),
    partyId: id,
    partyName: list?.name ?? "Lista",
    color: list?.color ?? "#94a3b8",
    ideology: list?.ideology ?? 0,
  };
}

export function PassAndPlay({ demo }: { demo?: string }) {
  const lists = useMemo(() => currentNationalLists(), []);
  const [step, setStep] = useState<Step>("mode");
  const [mode, setMode] = useState<ModeId>("nazionali");
  const [territory, setTerritory] = useState("Italia");
  const [p1, setP1] = useState<Draft>(() => partyFromId("fratelli-ditalia"));
  const [p2, setP2] = useState<Draft>(() => partyFromId("partito-democratico"));
  const [rounds, setRounds] = useState<{ player: 1 | 2; theme: string; choice: number }[]>([]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [seconds, setSeconds] = useState(20);
  const [result, setResult] = useState<ContestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [share, setShare] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(0);

  const selected = MODES.find((item) => item.id === mode)!;
  const territories = selected.level === "regionali" ? [...REGION_NAMES] : selected.level === "comunali" ? CITIES : ["Italia"];

  useEffect(() => {
    if (demo !== "mussolini") return;
    const payload = {
      level: "nazionali" as const,
      territory: "Italia",
      label: "Caso storico",
      seed: 1948,
      players: [
        {
          id: "p1",
          displayName: "Giocatore 1",
          partyId: "lista-controfattuale",
          partyName: "Lista controfattuale",
          color: "#4b5563",
          ideology: 0.95,
          candidateName: "Benito Mussolini",
          custom: true,
        },
        {
          id: "p2",
          displayName: "Giocatore 2",
          partyId: "partito-democratico",
          partyName: "Partito Democratico",
          color: "#E31C2B",
          ideology: -0.35,
          candidateName: "Elly Schlein",
        },
      ],
    };
    setStep("night");
    void fetch("/api/game/contest", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) })
      .then((response) => response.json())
      .then((body: ContestResult) => {
        setResult(body);
        setStep("result");
      })
      .catch(() => setError("La simulazione non è partita."));
  }, [demo]);

  useEffect(() => {
    if (step !== "night" || !result) return;
    setRevealed(0);
    const timer = window.setInterval(() => {
      setRevealed((value) => {
        if (value >= result.shares.length) {
          window.clearInterval(timer);
          return value;
        }
        return value + 1;
      });
    }, 450);
    return () => window.clearInterval(timer);
  }, [step, result]);

  useEffect(() => {
    if (step !== "round") return;
    setSeconds(20);
    const timer = window.setInterval(() => setSeconds((value) => (value > 0 ? value - 1 : 0)), 1000);
    return () => window.clearInterval(timer);
  }, [step, roundIndex]);

  function chooseMode(id: ModeId) {
    const next = MODES.find((item) => item.id === id)!;
    setMode(id);
    setTerritory(next.level === "comunali" ? "Roma" : next.level === "regionali" ? "Lazio" : "Italia");
    setStep(next.level === "nazionali" && id !== "regionale" ? "p1" : "territory");
    if (id === "nazionali" || id === "duello" || id === "draft") setStep("p1");
  }

  function armHandoff(next: Step) {
    setStep(next);
  }

  async function finish(extra: ScenarioInput[] = [], duelRounds = rounds) {
    setError(null);
    setStep("night");
    const scenarios = [...extra];
    if (mode === "duello") {
      for (const round of duelRounds) {
        const theme = round.theme === "migration" ? "migration" : round.theme === "security" ? "security" : "recession";
        scenarios.push({
          id: `turno-${round.player}-${theme}`,
          title: `Turno ${round.player}: ${THEMES.find((item) => item.id === round.theme)?.label ?? theme}`,
          intensity: 0.35 + Math.abs(round.choice) * 0.25,
          duration: "breve",
          scope: "nazionale",
          themes: { [theme]: 1 },
          origin: "drawn",
        });
      }
    }
    if (mode === "duello" && scenarios.length < 2) {
      const drawn = drawScenario(() => Math.random());
      scenarios.push(drawn);
    }
    const response = await fetch("/api/game/contest", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        level: selected.level,
        territory,
        label: selected.title,
        seed: Math.floor(Math.random() * 1e9),
        scenarios,
        players: [p1, p2].map((player, index) => ({
          id: `p${index + 1}`,
          displayName: player.displayName || `Giocatore ${index + 1}`,
          partyId: player.custom ? `lista-${index + 1}` : player.partyId,
          partyName: player.partyName,
          color: player.color,
          ideology: player.ideology,
          candidateName: player.candidateName,
          custom: player.custom,
        })),
      }),
    });
    if (!response.ok) {
      setError("La simulazione non è partita.");
      setStep("p2");
      return;
    }
    const body = (await response.json()) as ContestResult;
    setResult(body);
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify({ label: body.label, players: body.players.map((player) => ({ name: player.candidateName, party: player.partyName, percentage: player.percentage, score: player.score })), notes: body.notes.filter((note) => note.includes("Nota informativa") || note.includes("riconosciuto")).slice(0, 4) }))));
    setShare(`/gioco/locale?s=${encoded}`);
    window.setTimeout(() => setStep("result"), 700);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col px-4 py-8">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--it-blue)]">Passa il telefono</p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl leading-none">Due giocatori, uno schermo.</h1>
      <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
        Le scelte dell&apos;altro restano coperte finché non arriva il suo turno. I numeri vengono dal simulatore, con gli scenari del duello.
      </p>

      {step === "mode" ? (
        <div className="mt-8 space-y-3">
          {MODES.map((item) => (
            <button key={item.id} type="button" onClick={() => chooseMode(item.id)} className="hub-card w-full rounded-2xl p-4 text-left">
              <span className="text-xs text-[var(--muted)]">{item.index}</span>
              <span className="mt-1 block text-lg font-semibold">{item.title}</span>
              <span className="mt-1 block text-sm text-[var(--muted)]">{item.text}</span>
            </button>
          ))}
        </div>
      ) : null}

      {step === "territory" ? (
        <label className="mt-8 block text-sm">
          Territorio
          <select className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-3" value={territory} onChange={(event) => setTerritory(event.target.value)}>
            {territories.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
          <button type="button" className="mt-4 w-full rounded-xl bg-[var(--it-blue)] px-4 py-3 text-sm font-semibold text-white" onClick={() => setStep("p1")}>
            Continua
          </button>
        </label>
      ) : null}

      {step === "p1" || step === "p2" ? (
        <PlayerForm
          title={step === "p1" ? "Giocatore 1" : "Giocatore 2"}
          draft={step === "p1" ? p1 : p2}
          lists={lists}
          quick={mode === "draft"}
          onChange={step === "p1" ? setP1 : setP2}
          onSubmit={() => {
            if (step === "p1") armHandoff("handoff");
            else if (mode === "duello") {
              setRoundIndex(0);
              setRounds([]);
              armHandoff("round-handoff");
            } else void finish();
          }}
        />
      ) : null}

      {step === "handoff" || step === "round-handoff" ? (
        <section className="mt-16 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Schermata di passaggio</p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-5xl">Passa il telefono.</h2>
          <p className="mt-4 text-sm text-[var(--muted)]">
            {step === "handoff" ? "Tocca al giocatore 2. Le scelte del giocatore 1 non sono su questa schermata." : `Turno ${roundIndex + 1} di 3. Chi gioca adesso non vede la risposta precedente.`}
          </p>
          <button
            type="button"
            className="mt-8 w-full rounded-xl bg-[var(--it-blue)] px-4 py-3 text-sm font-semibold text-white"
            onClick={() => setStep(step === "handoff" ? "p2" : "round")}
          >
            Ho il telefono
          </button>
        </section>
      ) : null}

      {step === "round" ? (
        <section className="mt-8">
          <p className="text-sm text-[var(--muted)]">Giocatore {roundIndex % 2 === 0 ? 1 : 2} · {seconds}s</p>
          <h2 className="mt-2 text-2xl font-semibold">{THEMES[roundIndex % 3]?.label}</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {["Più aperto", "Più fermo"].map((label, index) => (
              <button
                key={label}
                type="button"
                className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-6 text-sm font-semibold"
                onClick={() => {
                  const player = (roundIndex % 2 === 0 ? 1 : 2) as 1 | 2;
                  const theme = THEMES[roundIndex % 3]!.id;
                  const nextRounds = [...rounds, { player, theme, choice: index === 0 ? -1 : 1 }];
                  setRounds(nextRounds);
                  if (roundIndex >= 5) void finish([], nextRounds);
                  else {
                    setRoundIndex(roundIndex + 1);
                    setStep("round-handoff");
                  }
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {step === "night" ? (
        <section className="mt-16" aria-live="polite">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Sera dello spoglio</p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-5xl">I seggi stanno arrivando.</h2>
          <ul className="mt-6 space-y-3">
            {(result?.shares ?? []).slice(0, revealed).map((share) => (
              <li key={share.id}>
                <div className="flex justify-between text-sm">
                  <span>{share.name}</span>
                  <span>{share.mean.toFixed(1)}%</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-[var(--surface-2)]">
                  <div className="h-2 rounded-full" style={{ width: `${Math.min(100, share.mean)}%`, background: share.color }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {step === "result" && result ? (
        <section className="mt-8 space-y-4">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{result.label}{result.territory ? ` · ${result.territory}` : ""}</p>
          {result.players.map((player) => (
            <article key={player.id} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
              <p className="text-xs text-[var(--muted)]">{player.won ? "Davanti" : "Insegue"} · punteggio {player.score}</p>
              <h2 className="mt-1 text-2xl font-semibold">{player.candidateName}</h2>
              <p className="text-sm text-[var(--muted)]">{player.partyName}</p>
              <p className="mt-3 font-[family-name:var(--font-display)] text-4xl">{player.percentage.toFixed(1)}%</p>
              <p className="text-sm text-[var(--muted)]">{player.seats} seggi attesi</p>
              {player.assessment.explanation ? <p className="mt-3 text-sm leading-relaxed">{player.assessment.explanation}</p> : null}
              {player.assessment.legalNote ? (
                <p className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm leading-relaxed">{player.assessment.legalNote}</p>
              ) : null}
            </article>
          ))}
          {result.notes.filter((note) => note.startsWith("Crisi") || note.startsWith("Scenario") || note.includes("Contesto d'archivio") || note.includes("Turno")).slice(0, 6).map((note) => (
            <p key={note} className="text-sm leading-relaxed text-[var(--muted)]">{note}</p>
          ))}
          {share ? (
            <p className="text-sm">
              <a className="font-semibold text-[var(--it-blue)] underline" href={share}>Apri il risultato condiviso</a>
            </p>
          ) : null}
          <button type="button" className="w-full rounded-xl border border-[var(--border)] px-4 py-3 text-sm" onClick={() => { setStep("mode"); setResult(null); }}>
            Nuova partita
          </button>
        </section>
      ) : null}
      {error ? <p className="mt-4 text-sm text-[#ff2357]">{error}</p> : null}
    </div>
  );
}

function PlayerForm({
  title,
  draft,
  lists,
  quick,
  onChange,
  onSubmit,
}: {
  title: string;
  draft: Draft;
  lists: { id: string; name: string }[];
  quick: boolean;
  onChange: (next: Draft) => void;
  onSubmit: () => void;
}) {
  return (
    <form
      className="mt-8 space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!draft.candidateName.trim()) return;
        onSubmit();
      }}
    >
      <h2 className="text-2xl font-semibold">{title}</h2>
      <label className="block text-sm">
        Nome in pista
        <input className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-3" value={draft.displayName} onChange={(event) => onChange({ ...draft, displayName: event.target.value })} />
      </label>
      <label className="block text-sm">
        Lista
        <select
          className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-3"
          value={draft.custom ? "custom" : draft.partyId}
          onChange={(event) => {
            if (event.target.value === "custom") onChange({ ...draft, custom: true, partyName: "Lista nuova", color: "#94a3b8", ideology: 0 });
            else {
              const list = currentNationalLists().find((item) => item.id === event.target.value);
              onChange({
                ...draft,
                custom: false,
                partyId: event.target.value,
                partyName: list?.name ?? event.target.value,
                color: list?.color ?? "#94a3b8",
                ideology: list?.ideology ?? 0,
              });
            }
          }}
        >
          {lists.map((list) => (
            <option key={list.id} value={list.id}>{list.name}</option>
          ))}
          <option value="custom">Lista nuova</option>
        </select>
      </label>
      {draft.custom ? (
        <>
          <label className="block text-sm">
            Nome della lista
            <input className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-3" value={draft.partyName} onChange={(event) => onChange({ ...draft, partyName: event.target.value })} />
          </label>
          <label className="block text-sm">
            Schema sinistra-destra ({draft.ideology.toFixed(2)})
            <input type="range" min={-1} max={1} step={0.05} value={draft.ideology} onChange={(event) => onChange({ ...draft, ideology: Number(event.target.value) })} className="mt-2 w-full" />
          </label>
        </>
      ) : null}
      <label className="block text-sm">
        Candidato o leader
        <input required className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-3" value={draft.candidateName} placeholder="Nome e cognome" onChange={(event) => onChange({ ...draft, candidateName: event.target.value })} />
      </label>
      {quick ? null : <p className="text-xs text-[var(--muted)]">Un nome noto viene letto dall&apos;archivio curato. Un nome sconosciuto resta un candidato descritto da te.</p>}
      <button type="submit" className="w-full rounded-xl bg-[var(--it-blue)] px-4 py-3 text-sm font-semibold text-white">
        Conferma e copri
      </button>
    </form>
  );
}
