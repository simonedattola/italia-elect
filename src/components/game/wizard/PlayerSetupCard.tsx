"use client";

import { PARTIES_BY_IDEOLOGY } from "@/lib/game/modeConfig";
import { ideologyLabelFromScore } from "@/lib/game/ideologyLabels";
import type { PlayerFormState } from "@/lib/game/types";
import { CustomPartyBuilder } from "./CustomPartyBuilder";
import { Input, Textarea, Label } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PlayerSetupCardProps {
  index: number;
  form: PlayerFormState;
  onChange: (patch: Partial<PlayerFormState>) => void;
  onRemove?: () => void;
  canRemove: boolean;
}

export function PlayerSetupCard({
  index,
  form,
  onChange,
  onRemove,
  canRemove,
}: PlayerSetupCardProps) {
  return (
    <article className="hub-card rounded-xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
          Giocatore {index + 1}
        </h3>
        {canRemove && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-[var(--it-red)] hover:underline"
          >
            Rimuovi
          </button>
        )}
      </div>

      <div className="grid gap-4">
        <div>
          <Label htmlFor={`name-${form.id}`}>Nome giocatore</Label>
          <Input
            id={`name-${form.id}`}
            value={form.displayName}
            onChange={(e) => onChange({ displayName: e.target.value })}
            placeholder="Il tuo nickname"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor={`leader-fn-${form.id}`}>Leader — Nome</Label>
            <Input
              id={`leader-fn-${form.id}`}
              value={form.leaderFirstName}
              onChange={(e) => onChange({ leaderFirstName: e.target.value })}
              placeholder="Nome"
            />
          </div>
          <div>
            <Label htmlFor={`leader-ln-${form.id}`}>Leader — Cognome</Label>
            <Input
              id={`leader-ln-${form.id}`}
              value={form.leaderLastName}
              onChange={(e) => onChange({ leaderLastName: e.target.value })}
              placeholder="Cognome"
            />
          </div>
        </div>

        <div>
          <Label>Partito</Label>
          <p className="mb-1 text-xs text-[var(--muted)]">
            Da estrema sinistra a estrema destra
          </p>
          <Select value={form.partySlug || undefined} onValueChange={(v) => onChange({ partySlug: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Seleziona partito…" />
            </SelectTrigger>
            <SelectContent>
              {PARTIES_BY_IDEOLOGY.map((p) => (
                <SelectItem key={p.slug} value={p.slug}>
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: p.color }}
                    />
                    {p.shortName} — {ideologyLabelFromScore(p.ideologyScore)}
                  </span>
                </SelectItem>
              ))}
              <SelectItem value="custom">
                <span className="font-medium">+ Crea il tuo partito</span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {form.partySlug === "custom" && (
          <CustomPartyBuilder form={form} onChange={onChange} />
        )}

        <div>
          <Label htmlFor={`desc-${form.id}`}>Descrizione del candidato</Label>
          <Textarea
            id={`desc-${form.id}`}
            value={form.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Biografia, esperienza, immagine pubblica…"
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor={`prog-${form.id}`}>Programma elettorale</Label>
          <Textarea
            id={`prog-${form.id}`}
            value={form.program}
            onChange={(e) => onChange({ program: e.target.value })}
            placeholder="Priorità di governo, riforme, proposte…"
            rows={4}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor={`vp-fn-${form.id}`}>Vicepresidente — Nome</Label>
            <Input
              id={`vp-fn-${form.id}`}
              value={form.vpFirstName}
              onChange={(e) => onChange({ vpFirstName: e.target.value })}
              placeholder="Nome"
            />
          </div>
          <div>
            <Label htmlFor={`vp-ln-${form.id}`}>Vicepresidente — Cognome</Label>
            <Input
              id={`vp-ln-${form.id}`}
              value={form.vpLastName}
              onChange={(e) => onChange({ vpLastName: e.target.value })}
              placeholder="Cognome"
            />
          </div>
        </div>
      </div>
    </article>
  );
}
