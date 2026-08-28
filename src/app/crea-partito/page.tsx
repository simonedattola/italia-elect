"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { PageHeader, PageShell } from "@/components/layout/page-header";
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
import { Slider } from "@/components/ui/slider";
import type { CoalitionFamily } from "@/types/simulation";

export default function CreaPartitoPage() {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [ideology, setIdeology] = useState(0);
  const [coalition, setCoalition] = useState<CoalitionFamily>("ALTRO");
  const [program, setProgram] = useState("");
  const [leader, setLeader] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const res = await fetch("/api/parties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          color,
          ideologyScore: ideology,
          coalitionFamily: coalition,
          program,
          leader,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      toast.success(data.party.name);
      setName("");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <PageShell narrow>
      <PageHeader title="Crea partito" />

      <form onSubmit={onSubmit} className="panel space-y-5 rounded-lg p-5 sm:p-6">
        <div className="space-y-2">
          <Label>Nome</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Colore</Label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-full rounded-md border border-[var(--border)] bg-transparent"
            />
          </div>
          <div className="space-y-2">
            <Label>Coalizione</Label>
            <Select value={coalition} onValueChange={(v) => setCoalition(v as CoalitionFamily)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["CENTRODESTRA", "CENTROSINISTRA", "CENTRO", "ALTRO", "DESTRA", "SINISTRA"].map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Ideologia ({ideology.toFixed(2)})</Label>
          <Slider value={[ideology]} min={-1} max={1} step={0.05} onValueChange={(v) => setIdeology(v[0] ?? 0)} />
        </div>
        <div className="space-y-2">
          <Label>Programma</Label>
          <Textarea value={program} onChange={(e) => setProgram(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Leader</Label>
          <Input value={leader} onChange={(e) => setLeader(e.target.value)} />
        </div>
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "…" : "Crea"}
        </Button>
      </form>

      <Button asChild variant="outline" className="mt-6">
        <Link href="/simula">Simula</Link>
      </Button>
    </PageShell>
  );
}
