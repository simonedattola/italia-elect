"use client";

import { useState } from "react";
import { SCENARIO_PRESETS } from "@/lib/scenarios/library";
import type { ScenarioInput, ScenarioScope } from "@/lib/scenarios/types";

export function ScenarioControls({
  scenarios,
  lists,
  onChange,
}: {
  scenarios: ScenarioInput[];
  lists: { id: string; name: string }[];
  onChange: (next: ScenarioInput[]) => void;
}) {
  const [presetId, setPresetId] = useState(SCENARIO_PRESETS[0]!.id);
  const [intensity, setIntensity] = useState(0.7);
  const [scope, setScope] = useState<ScenarioScope>("nazionale");
  const [partyId, setPartyId] = useState(lists[0]?.id ?? "");
  const [text, setText] = useState("");
  const [note, setNote] = useState<string | null>(null);

  function addPreset() {
    const preset = SCENARIO_PRESETS.find((item) => item.id === presetId);
    if (!preset) return;
    const next: ScenarioInput = {
      ...preset,
      intensity,
      scope,
      affectedPartyIds: preset.themes.corruption || preset.themes.leader ? [partyId].filter(Boolean) : undefined,
    };
    onChange([...scenarios, next]);
  }

  async function addText() {
    setNote(null);
    const response = await fetch("/api/scenario", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, intensity, scope, title: "Scenario dal testo" }),
    });
    if (!response.ok) {
      setNote("Il testo non è stato letto.");
      return;
    }
    const body = (await response.json()) as { scenario: ScenarioInput; interpretation: { note: string } };
    setNote(body.interpretation.note);
    onChange([...scenarios, body.scenario]);
    setText("");
  }

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold">Scenari</legend>
      <p className="text-xs leading-relaxed text-[var(--muted)]">
        Si impilano. Ogni schema dice chi guadagna e perché. L&apos;intensità zero non sposta nulla. Un evento locale pesa poco sulle politiche.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <select className="rounded-md border border-[var(--border)] bg-[var(--card)] px-2 py-2 text-sm" value={presetId} onChange={(event) => setPresetId(event.target.value)}>
          {SCENARIO_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>{preset.title}</option>
          ))}
        </select>
        <select className="rounded-md border border-[var(--border)] bg-[var(--card)] px-2 py-2 text-sm" value={scope} onChange={(event) => setScope(event.target.value as ScenarioScope)}>
          <option value="nazionale">Nazionale</option>
          <option value="regionale">Regionale</option>
          <option value="comunale">Comunale</option>
        </select>
      </div>
      <label className="block text-xs text-[var(--muted)]">
        Intensità {Math.round(intensity * 100)}%
        <input type="range" min={0} max={1} step={0.05} value={intensity} onChange={(event) => setIntensity(Number(event.target.value))} className="mt-1 w-full" />
      </label>
      <label className="block text-xs text-[var(--muted)]">
        Lista colpita, se è uno scandalo
        <select className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-2 py-2 text-sm text-[var(--foreground)]" value={partyId} onChange={(event) => setPartyId(event.target.value)}>
          {lists.map((list) => (
            <option key={list.id} value={list.id}>{list.name}</option>
          ))}
        </select>
      </label>
      <button type="button" className="rounded-md bg-[var(--it-blue)] px-3 py-2 text-sm font-semibold text-white" onClick={addPreset}>
        Aggiungi scenario
      </button>
      <label className="block text-xs text-[var(--muted)]">
        Oppure descrivilo
        <textarea value={text} onChange={(event) => setText(event.target.value)} maxLength={600} rows={3} className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-2 py-2 text-sm text-[var(--foreground)]" />
      </label>
      <button type="button" className="rounded-md border border-[var(--border)] px-3 py-2 text-sm" onClick={() => void addText()} disabled={!text.trim()}>
        Leggi il testo
      </button>
      {note ? <p className="text-xs leading-relaxed text-[var(--muted)]">{note}</p> : null}
      <ul className="space-y-2">
        {scenarios.map((scenario, index) => (
          <li key={`${scenario.id}-${index}`} className="flex items-start justify-between gap-2 rounded-md border border-[var(--border)] px-2 py-2 text-xs">
            <span>{scenario.title} · {Math.round(scenario.intensity * 100)}% · {scenario.scope}</span>
            <button type="button" className="underline" onClick={() => onChange(scenarios.filter((_, item) => item !== index))}>Togli</button>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
