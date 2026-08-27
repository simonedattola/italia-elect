"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Download,
  Share2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  NationalBarChart,
  SwingChart,
  HistoryLineChart,
  CandidateRadar,
  SeatsChart,
} from "@/components/charts/election-charts";
import { ItalyMap } from "@/components/map/italy-map";
import { publishSimulation } from "@/actions/simulate";
import { formatPercent } from "@/lib/utils";
import { getParty } from "@/lib/electoral/parties";
import type { CandidateProfile, SimulationOutput } from "@/types/simulation";
import type { InfluenceFactor, SimulationScenarios } from "@/types/intelligence";
import { exportResultsPdf } from "@/lib/export/pdf";

export type SimulationViewData = {
  id: string;
  slug: string;
  createdAt: string;
  winProbability: number;
  confidenceLow: number;
  confidenceHigh: number;
  analysis: string | null;
  isPublic: boolean;
  shareSlug: string | null;
  nationalResults: SimulationOutput["nationalResults"];
  chamberSeats: SimulationOutput["chamberSeats"];
  senateSeats: SimulationOutput["senateSeats"];
  coalitions: SimulationOutput["coalitions"];
  provincialMap: SimulationOutput["provincialMap"];
  modelMeta: SimulationOutput["modelMeta"];
  influenceFactors?: InfluenceFactor[];
  scenarios?: SimulationScenarios | null;
  candidate: {
    id: string;
    firstName: string;
    lastName: string;
    partySlug: string;
    description: string;
    program: string | null;
    photoUrl: string | null;
    isPublicFigure: boolean;
    profile: CandidateProfile | null;
  };
};

export function ResultsView({ data }: { data: SimulationViewData }) {
  const party = getParty(data.candidate.partySlug);
  const leader = data.nationalResults.find(
    (r) => r.partySlug === data.candidate.partySlug
  );
  const [shareSlug, setShareSlug] = useState(data.shareSlug);

  async function onShare() {
    if (shareSlug) {
      const url = `${window.location.origin}/condividi/${shareSlug}`;
      await navigator.clipboard.writeText(url);
      toast.success("Link pubblico copiato");
      return;
    }
    const res = await publishSimulation(data.slug);
    setShareSlug(res.shareSlug);
    const url = `${window.location.origin}/condividi/${res.shareSlug}`;
    await navigator.clipboard.writeText(url);
    toast.success("Simulazione pubblicata — link copiato");
  }

  function onExport() {
    exportResultsPdf(data);
    toast.success("PDF generato");
  }

  return (
    <div className="space-y-8" id="results-root">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-6 border-b border-[var(--border)] pb-8 lg:flex-row lg:items-end lg:justify-between"
      >
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">
            Simulazione nazionale · {new Date(data.createdAt).toLocaleString("it-IT")}
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--it-blue)] sm:text-5xl">
            {data.candidate.firstName}{" "}
            <span className="text-[var(--foreground)]">{data.candidate.lastName}</span>
          </h1>
          <p className="max-w-2xl text-[var(--muted)]">
            Leader di{" "}
            <span className="font-medium text-[var(--foreground)]">{party?.name}</span>
            {" · "}
            {formatPercent(leader?.percentage ?? 0)} nazionale (IC 80%:{" "}
            {formatPercent(data.confidenceLow)}–{formatPercent(data.confidenceHigh)})
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onShare}>
            <Share2 className="h-4 w-4" /> Condividi
          </Button>
          <Button variant="outline" onClick={onExport}>
            <Download className="h-4 w-4" /> Esporta PDF
          </Button>
          <Button asChild variant="secondary">
            <Link href="/confronto">Confronta</Link>
          </Button>
        </div>
      </motion.section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Probabilità vittoria"
          value={`${data.winProbability}%`}
          hint="Monte Carlo · 1° partito o maggioranza coalizione"
        />
        <Stat
          label="Quota nazionale"
          value={formatPercent(leader?.percentage ?? 0)}
          hint={`Swing ${leader && leader.swing >= 0 ? "+" : ""}${leader?.swing ?? 0} pt`}
        />
        <Stat
          label="Seggi Camera"
          value={String(leader?.seatsChamber ?? 0)}
          hint={`su ${data.chamberSeats.total} · soglia maggioranza ${data.chamberSeats.majorityThreshold}`}
        />
        <Stat
          label="Seggi Senato"
          value={String(leader?.seatsSenate ?? 0)}
          hint={`su ${data.senateSeats.total}`}
        />
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-[var(--it-blue)]/20 bg-[var(--it-blue)]/5 p-4 text-sm">
        {data.modelMeta.candidateDataQuality === "insufficient" ||
        data.modelMeta.candidateDataQuality === "low" ? (
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
        ) : (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--it-blue)]" />
        )}
        <div>
          <p className="font-medium">Simulazione statistica — non previsione certa</p>
          <p className="mt-1 text-[var(--muted)]">{data.modelMeta.disclaimer}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Qualità dati candidato: {data.modelMeta.candidateDataQuality} · seed{" "}
            {data.modelMeta.seed} · {data.modelMeta.monteCarloRuns.toLocaleString("it-IT")} run ·
            modello {data.modelMeta.version}
          </p>
        </div>
      </div>

      {data.influenceFactors && data.influenceFactors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Cosa sta influenzando questa simulazione?</CardTitle>
            <CardDescription>
              Decomposizione Context Intelligence — effetto stimato sul partito leader
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.influenceFactors.map((f) => (
              <div
                key={f.id}
                className="flex flex-col gap-1 border-b border-[var(--border)]/60 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm">{f.label}</p>
                  <p className="text-xs text-[var(--muted)]">{f.detail}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
                    peso {(f.weight * 100).toFixed(0)}%
                  </span>
                  <span
                    className={`font-[family-name:var(--font-display)] text-xl ${
                      f.polarity === "positive"
                        ? "text-emerald-600"
                        : f.polarity === "negative"
                          ? "text-[var(--it-red)]"
                          : "text-[var(--foreground)]"
                    }`}
                  >
                    {f.effectPts > 0 ? "+" : ""}
                    {f.effectPts.toFixed(1)} pt
                  </span>
                </div>
              </div>
            ))}
            {data.scenarios && (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-[var(--surface)] p-3 text-sm">
                  <p className="text-xs text-[var(--muted)]">Scenario medio</p>
                  <p className="font-[family-name:var(--font-display)] text-2xl text-[var(--it-blue)]">
                    {formatPercent(data.scenarios.leaderMean)}
                  </p>
                </div>
                <div className="rounded-lg bg-[var(--surface)] p-3 text-sm">
                  <p className="text-xs text-[var(--muted)]">Migliore (p90)</p>
                  <p className="font-[family-name:var(--font-display)] text-2xl text-emerald-600">
                    {formatPercent(data.scenarios.leaderBest)}
                  </p>
                </div>
                <div className="rounded-lg bg-[var(--surface)] p-3 text-sm">
                  <p className="text-xs text-[var(--muted)]">Peggiore (p10)</p>
                  <p className="font-[family-name:var(--font-display)] text-2xl text-[var(--it-red)]">
                    {formatPercent(data.scenarios.leaderWorst)}
                  </p>
                </div>
              </div>
            )}
            <p className="pt-2 text-xs text-[var(--muted)]">
              Ultimo aggiornamento contesto: {new Date(data.modelMeta.generatedAt).toLocaleString("it-IT")}
              {" · "}
              Fonti principali: {data.modelMeta.dataSources.slice(0, 4).join(" · ")}
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="nazionale">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="nazionale">Nazionale</TabsTrigger>
          <TabsTrigger value="mappa">Mappa</TabsTrigger>
          <TabsTrigger value="seggi">Seggi & coalizioni</TabsTrigger>
          <TabsTrigger value="candidato">Profilo</TabsTrigger>
          <TabsTrigger value="analisi">Analisi IA</TabsTrigger>
        </TabsList>

        <TabsContent value="nazionale" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Percentuali nazionali</CardTitle>
                <CardDescription>Tutti i partiti — stima media Monte Carlo</CardDescription>
              </CardHeader>
              <CardContent>
                <NationalBarChart results={data.nationalResults} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Variazione consenso</CardTitle>
                <CardDescription>Swing rispetto alla baseline storica</CardDescription>
              </CardHeader>
              <CardContent>
                <SwingChart results={data.nationalResults} />
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Andamento storico del partito</CardTitle>
              <CardDescription>Serie da consultazioni incorporate (Eligendo)</CardDescription>
            </CardHeader>
            <CardContent>
              <HistoryLineChart partySlug={data.candidate.partySlug} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Tabella risultati</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[var(--border)] text-[var(--muted)]">
                  <tr>
                    <th className="py-2 pr-4">Partito</th>
                    <th className="py-2 pr-4">%</th>
                    <th className="py-2 pr-4">IC 80%</th>
                    <th className="py-2 pr-4">Swing</th>
                    <th className="py-2 pr-4">Camera</th>
                    <th className="py-2">Senato</th>
                  </tr>
                </thead>
                <tbody>
                  {data.nationalResults.map((r) => (
                    <tr key={r.partySlug} className="border-b border-[var(--border)]/60">
                      <td className="py-2.5 pr-4">
                        <span
                          className="mr-2 inline-block h-2.5 w-2.5 rounded-full"
                          style={{ background: r.color }}
                        />
                        {r.partyName}
                      </td>
                      <td className="py-2.5 pr-4 font-medium">{formatPercent(r.percentage)}</td>
                      <td className="py-2.5 pr-4 text-[var(--muted)]">
                        {formatPercent(r.percentageLow)}–{formatPercent(r.percentageHigh)}
                      </td>
                      <td className="py-2.5 pr-4">
                        {r.swing >= 0 ? "+" : ""}
                        {r.swing.toFixed(1)}
                      </td>
                      <td className="py-2.5 pr-4">{r.seatsChamber}</td>
                      <td className="py-2.5">{r.seatsSenate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mappa">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <ItalyMap
              data={data.provincialMap}
              highlightSlug={data.candidate.partySlug}
            />
            <Card>
              <CardHeader>
                <CardTitle>Distribuzione geografica</CardTitle>
                <CardDescription>
                  Province colorate per partito vincente locale
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[480px] overflow-y-auto">
                {data.provincialMap
                  .filter((p) => p.winnerSlug === data.candidate.partySlug)
                  .slice(0, 25)
                  .map((p) => (
                    <div
                      key={p.provinceCode}
                      className="flex items-center justify-between border-b border-[var(--border)]/50 py-2 text-sm"
                    >
                      <span>
                        {p.provinceName}
                        <span className="text-[var(--muted)]"> · {p.regionName}</span>
                      </span>
                      <span className="font-medium">{formatPercent(p.percentage)}</span>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="seggi" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Allocazione seggi (modello semplificato)</CardTitle>
              <CardDescription>
                Proporzionale con soglia — non replica legale completa del Rosatellum
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SeatsChart
                chamber={data.chamberSeats.byParty}
                senate={data.senateSeats.byParty}
                results={data.nationalResults}
              />
            </CardContent>
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            {data.coalitions.map((c) => (
              <Card key={c.family}>
                <CardHeader>
                  <CardTitle className="text-base">{c.name}</CardTitle>
                  <CardDescription>{formatPercent(c.percentage)} complessivo</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>
                    Camera: <strong>{c.seatsChamber}</strong>{" "}
                    {c.hasMajorityChamber ? (
                      <span className="text-emerald-600">· maggioranza</span>
                    ) : (
                      <span className="text-[var(--muted)]">· no maggioranza</span>
                    )}
                  </p>
                  <p>
                    Senato: <strong>{c.seatsSenate}</strong>{" "}
                    {c.hasMajoritySenate ? (
                      <span className="text-emerald-600">· maggioranza</span>
                    ) : (
                      <span className="text-[var(--muted)]">· no maggioranza</span>
                    )}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="candidato">
          <div className="grid gap-6 lg:grid-cols-2">
            {data.candidate.profile && (
              <Card>
                <CardHeader>
                  <CardTitle>Radar candidato</CardTitle>
                  <CardDescription>
                    Inferenze modellistiche 0–100 — non fatti certificati
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CandidateRadar profile={data.candidate.profile} />
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader>
                <CardTitle>Note di evidenza</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-[var(--muted)]">
                {data.candidate.profile?.evidenceNotes.map((n, i) => (
                  <p key={i} className="border-l-2 border-[var(--it-red)]/40 pl-3">
                    {n}
                  </p>
                ))}
                <p className="pt-2 text-[var(--foreground)]">{data.candidate.description}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analisi">
          <Card>
            <CardHeader>
              <CardTitle>Analisi</CardTitle>
              <CardDescription>
                Ogni affermazione è collegata a variabili del modello
              </CardDescription>
            </CardHeader>
            <CardContent>
              <article className="prose-analysis max-w-none space-y-3 text-sm leading-relaxed whitespace-pre-wrap">
                {data.analysis}
              </article>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4"
    >
      <p className="text-xs uppercase tracking-wider text-[var(--muted)]">{label}</p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-3xl text-[var(--it-blue)]">
        {value}
      </p>
      <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p>
    </motion.div>
  );
}
