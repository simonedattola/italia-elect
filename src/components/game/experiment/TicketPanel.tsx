"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { parseCandidateName } from "@/lib/game/parseCandidateName";
import { customPartyIdeologyLabel } from "@/lib/game/ideologyLabels";
import { randomPoolEntry, playerFromPool } from "@/lib/game/experimentUtils";
import type { CandidateGameProfile, GamePlayer } from "@/lib/game/types";
import { nanoid } from "nanoid";

export function TicketPanel({
  side,
  label,
  player,
  onChange,
  onGenerate,
}: {
  side: "left" | "right";
  label: string;
  player: GamePlayer | null;
  onChange: (p: GamePlayer) => void;
  onGenerate: () => void;
}) {
  const accent = side === "left" ? "var(--exp-left)" : "var(--exp-right)";
  const [fullName, setFullName] = useState(
    player ? `${player.candidate.firstName} ${player.candidate.lastName}` : "",
  );
  const [partySlug, setPartySlug] = useState(player?.party.slug ?? "partito-democratico");
  const [description, setDescription] = useState(player?.candidate.description ?? "");
  const [program, setProgram] = useState(player?.candidate.program ?? "");
  const [preview, setPreview] = useState<CandidateGameProfile | null>(null);
  const previewSeq = useRef(0);

  const partyMeta = useMemo(() => {
    const p = PARTIES.find((x) => x.slug === partySlug)!;
    return {
      slug: p.slug,
      name: p.name,
      color: p.color,
      ideologyScore: p.ideologyScore,
    };
  }, [partySlug]);

  useEffect(() => {
    const parsed = parseCandidateName(fullName);
    if (!parsed.firstName || parsed.firstName.length < 2) {
      setPreview(null);
      return;
    }
    const seq = ++previewSeq.current;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/game/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            candidate: {
              firstName: parsed.firstName,
              lastName: parsed.lastName,
              description,
              program,
            },
            party: partyMeta,
          }),
        });
        const data = await res.json();
        if (seq === previewSeq.current && data.ok) setPreview(data.profile);
      } catch {
        if (seq === previewSeq.current) setPreview(null);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [fullName, description, program, partyMeta]);

  function commit() {
    const parsed = parseCandidateName(fullName);
    if (!parsed.firstName) return;
    const p = PARTIES.find((x) => x.slug === partySlug)!;
    onChange({
      id: player?.id ?? nanoid(8),
      displayName: label,
      party: {
        slug: p.slug,
        name: p.name,
        color: p.color,
        ideologyScore: p.ideologyScore,
      },
      candidate: {
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        description,
        program,
      },
      isHuman: side === "left",
    });
  }

  useEffect(() => {
    if (player) {
      setFullName(`${player.candidate.firstName} ${player.candidate.lastName}`);
      setPartySlug(player.party.slug);
      setDescription(player.candidate.description ?? "");
      setProgram(player.candidate.program ?? "");
    }
  }, [player?.id, player?.candidate.firstName, player?.candidate.lastName, player?.party.slug]);

  return (
    <div
      className="glass flex flex-col gap-3 rounded-xl p-4"
      style={{ borderTop: `3px solid ${accent}` }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: accent }}>
          {label}
        </p>
        <Button type="button" size="sm" variant="outline" onClick={onGenerate}>
          Genera
        </Button>
      </div>

      <div className="space-y-2">
        <Label className="text-[10px] uppercase text-[var(--muted)]">Candidato</Label>
        <Input
          placeholder="es. Elly Schlein"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          onBlur={commit}
          className="h-9 border-[var(--border)] bg-[var(--surface)]"
        />
      </div>

      <Select
        value={partySlug}
        onValueChange={(v) => {
          setPartySlug(v);
          setTimeout(commit, 0);
        }}
      >
        <SelectTrigger className="h-9 border-[var(--border)] bg-[var(--surface)]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PARTIES.map((p) => (
            <SelectItem key={p.slug} value={p.slug}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Textarea
        placeholder="Descrizione breve…"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        onBlur={commit}
        className="min-h-[52px] border-[var(--border)] bg-[var(--surface)] text-sm"
      />

      <Textarea
        placeholder="Programma elettorale…"
        value={program}
        onChange={(e) => setProgram(e.target.value)}
        onBlur={commit}
        className="min-h-[64px] border-[var(--border)] bg-[var(--surface)] text-sm"
      />

      {preview && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 text-[11px]">
          <p className="font-medium text-[var(--foreground)]">
            {preview.name} · {preview.positionLabel}
          </p>
          <p className="text-[var(--muted)]">
            Compat. {preview.compatibility}% · Pop. {preview.popularity}
          </p>
        </div>
      )}

      <p className="text-[10px] text-[var(--muted)]">
        {partyMeta.name} · {customPartyIdeologyLabel(partyMeta.ideologyScore)}
      </p>
    </div>
  );
}

export function generateTicket(displayName: string, partySlug?: string): GamePlayer {
  return playerFromPool(randomPoolEntry(partySlug), displayName);
}
