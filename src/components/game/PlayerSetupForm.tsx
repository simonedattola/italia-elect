"use client";

import { useState } from "react";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PARTIES } from "@/lib/electoral/parties";
import type { GamePlayer } from "@/lib/game/types";
import { nanoid } from "nanoid";

export function PlayerSetupForm({
  index,
  onConfirm,
  defaultName,
}: {
  index: number;
  onConfirm: (player: GamePlayer) => void;
  defaultName?: string;
}) {
  const [displayName, setDisplayName] = useState(defaultName ?? `Giocatore ${index + 1}`);
  const [fullName, setFullName] = useState("");
  const [vpName, setVpName] = useState("");
  const [partySlug, setPartySlug] = useState("fratelli-ditalia");
  const [customParty, setCustomParty] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customColor, setCustomColor] = useState("#7C3AED");
  const [customIdeology, setCustomIdeology] = useState(0);
  const [description, setDescription] = useState("");
  const [program, setProgram] = useState("");

  function splitName(full: string) {
    const parts = full.trim().split(/\s+/);
    if (parts.length < 2) return { firstName: parts[0] ?? "", lastName: parts[0] ?? "" };
    return { firstName: parts[0]!, lastName: parts.slice(1).join(" ") };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const party = customParty
      ? {
          slug: `custom-${nanoid(6)}`,
          name: customName.trim() || "Partito Custom",
          color: customColor,
          ideologyScore: customIdeology,
          isCustom: true as const,
        }
      : (() => {
          const p = PARTIES.find((x) => x.slug === partySlug)!;
          return {
            slug: p.slug,
            name: p.name,
            color: p.color,
            ideologyScore: p.ideologyScore,
          };
        })();
    const cand = splitName(fullName);
    const vp = vpName.trim() ? splitName(vpName) : undefined;
    onConfirm({
      id: nanoid(8),
      displayName,
      party,
      candidate: { firstName: cand.firstName, lastName: cand.lastName, description, program },
      vicePresident: vp
        ? { firstName: vp.firstName, lastName: vp.lastName }
        : undefined,
      isHuman: true,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="glass space-y-4 rounded-2xl p-5">
      <h3 className="font-semibold text-white">👤 {displayName}</h3>
      <div className="space-y-2">
        <Label>Nome giocatore</Label>
        <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Candidato (nome e cognome)</Label>
        <Input
          required
          placeholder="es. Giorgia Meloni"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={customParty}
            onChange={(e) => setCustomParty(e.target.checked)}
          />
          Crea partito custom
        </label>
        {customParty ? (
          <div className="space-y-3 rounded-xl border border-white/10 p-3">
            <Input
              placeholder="Nome partito"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              required
            />
            <div className="flex items-center gap-3">
              <Label className="shrink-0">Colore</Label>
              <input
                type="color"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                className="h-9 w-14 cursor-pointer rounded border-0 bg-transparent"
              />
            </div>
            <div className="space-y-1">
              <Label>Ideologia ({customIdeology > 0 ? "destra" : customIdeology < 0 ? "sinistra" : "centro"})</Label>
              <input
                type="range"
                min={-1}
                max={1}
                step={0.1}
                value={customIdeology}
                onChange={(e) => setCustomIdeology(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        ) : (
          <Select value={partySlug} onValueChange={setPartySlug}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PARTIES.map((p) => (
                <SelectItem key={p.slug} value={p.slug}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      <div className="space-y-2">
        <Label>Vicepresidente (opzionale)</Label>
        <Input
          placeholder="es. Ignazio La Russa"
          value={vpName}
          onChange={(e) => setVpName(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Descrizione</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[72px]" />
      </div>
      <div className="space-y-2">
        <Label>Programma</Label>
        <Textarea value={program} onChange={(e) => setProgram(e.target.value)} className="min-h-[88px]" />
      </div>
      <Button type="submit" className="w-full">Conferma giocatore</Button>
    </form>
  );
}
