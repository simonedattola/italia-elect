"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  HistoryLineChart,
  CandidateRadar,
  SeatsChart,
} from "@/components/charts/election-charts";
import { TrendTimeline } from "@/components/charts/TrendTimeline";
import { ItalyLeafletMap } from "@/components/map/italy-leaflet-map-wrapper";
import { FilteredElectionCharts } from "@/components/charts/FilteredElectionCharts";
import { ComuneTable } from "@/components/simulation/ComuneTable";
import { publishSimulation } from "@/actions/simulate";
import { formatPercent } from "@/lib/utils";
import { getParty } from "@/lib/electoral/parties";
import type { CandidateProfile, SimulationOutput } from "@/types/simulation";
import type { InfluenceFactor, SimulationScenarios } from "@/types/intelligence";
import { exportResultsPdf } from "@/lib/export/pdf";
import { AnimatedCounter } from "@/components/ui/motion";

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

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export function ResultsView({ data }: { data: SimulationViewData }) {
  const party = getParty(data.candidate.partySlug);
  const leader = data.nationalResults.find(
    (r) => r.partySlug === data.candidate.partySlug
  );
  const [shareSlug, setShareSlug] = useState(data.shareSlug);
  const uiScenario = data.scenarios?.uiScenario;
  const funAnalysis = data.scenarios?.funAnalysis;
  const isFun = uiScenario?.uiMode === "fun" || uiScenario?.chaosMode;

  async function onShare() {
    if (shareSlug) {
      const url = `${window.location.origin}/condividi/${shareSlug}`;
      await navigator.clipboard.writeText(url);
      toast.success("Link copiato");
      return;
    }
    const res = await publishSimulation(data.slug);
    setShareSlug(res.shareSlug);
    const url = `${window.location.origin}/condividi/${res.shareSlug}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copiato");
  }

  function onExport() {
    exportResultsPdf(data);
    toast.success("PDF");
  }

  return (
    <motion.div
      className="space-y-8"
      id="results-root"
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      <motion.section
        variants={fadeUp}
        className="flex flex-col gap-6 border-b border-[var(--border)] pb-8 lg:flex-row lg:items-end lg:justify-between"
      >
        <div className="space-y-2">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
            {data.candidate.firstName}{" "}
            <span className="text-[var(--muted)]">{data.candidate.lastName}</span>
          </h1>
          <p className="text-[var(--muted)]">
            {party?.name} ·{" "}
            <span className="font-mono-data text-[var(--it-blue)]">
              {formatPercent(leader?.percentage ?? 0)}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onShare}>
            <Share2 className="h-4 w-4" /> Condividi
          </Button>
          <Button variant="outline" onClick={onExport}>
            <Download className="h-4 w-4" /> PDF
          </Button>
          <Button asChild variant="secondary">
            <Link href="/confronto">Confronta</Link>
          </Button>
        </div>
      </motion.section>

      <motion.div variants={fadeUp} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Camera" value={leader?.seatsChamber ?? 0} />
        <KpiCard label="Senato" value={leader?.seatsSenate ?? 0} />
        <div className="glass card-3d rounded-2xl p-5 sm:p-6">
          <p className="text-xs text-[var(--muted)]">Vittoria</p>
          <p className="mt-1 font-mono-data text-3xl font-semibold text-white">
            <AnimatedCounter value={data.winProbability} suffix="%" />
          </p>
        </div>
        <div className="glass card-3d rounded-2xl p-5 sm:p-6">
          <p className="text-xs text-[var(--muted)]">IC 95%</p>
          <p className="mt-1 font-mono-data text-2xl font-semibold text-white sm:text-3xl">
            {formatPercent(data.confidenceLow)}–{formatPercent(data.confidenceHigh)}
          </p>
        </div>
      </motion.div>

      {data.influenceFactors && data.influenceFactors.length > 0 && (
        <motion.div variants={fadeUp}>
          <Card>
            <CardHeader>
              <CardTitle>Fattori</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.influenceFactors.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between border-b border-[var(--border)]/60 py-3 last:border-0"
                >
                  <p className="text-sm">{f.label}</p>
                  <span
                    className={`font-mono-data text-lg ${
                      f.polarity === "positive"
                        ? "text-[var(--it-green)]"
                        : f.polarity === "negative"
                          ? "text-[var(--it-red)]"
                          : "text-white"
                    }`}
                  >
                    {f.effectPts > 0 ? "+" : ""}
                    {f.effectPts.toFixed(1)}
                  </span>
                </div>
              ))}
              {data.scenarios && (
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-white/[0.03] p-3 text-sm">
                    <p className="text-xs text-[var(--muted)]">Medio</p>
                    <p className="font-mono-data text-2xl text-[var(--it-blue)]">
                      {formatPercent(data.scenarios.leaderMean)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/[0.03] p-3 text-sm">
                    <p className="text-xs text-[var(--muted)]">p90</p>
                    <p className="font-mono-data text-2xl text-[var(--it-green)]">
                      {formatPercent(data.scenarios.leaderBest)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/[0.03] p-3 text-sm">
                    <p className="text-xs text-[var(--muted)]">p10</p>
                    <p className="font-mono-data text-2xl text-[var(--it-red)]">
                      {formatPercent(data.scenarios.leaderWorst)}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div variants={fadeUp}>
        <Tabs defaultValue="nazionale">
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 glass">
            <TabsTrigger value="nazionale">Nazionale</TabsTrigger>
            <TabsTrigger value="mappa">Mappa</TabsTrigger>
            <TabsTrigger value="territori">Province</TabsTrigger>
            <TabsTrigger value="trend">Trend</TabsTrigger>
            <TabsTrigger value="seggi">Seggi</TabsTrigger>
            <TabsTrigger value="candidato">Profilo</TabsTrigger>
            <TabsTrigger value="analisi">Analisi</TabsTrigger>
            {isFun && <TabsTrigger value="bar">Bar</TabsTrigger>}
          </TabsList>

          <TabsContent value="nazionale" className="space-y-6">
            <FilteredElectionCharts
              nationalResults={data.nationalResults}
              provincialMap={data.provincialMap}
              defaultPartySlug={data.candidate.partySlug}
            />
            <Card>
              <CardHeader>
                <CardTitle>Storico</CardTitle>
              </CardHeader>
              <CardContent>
                <HistoryLineChart partySlug={data.candidate.partySlug} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Risultati</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-[var(--border)] text-[var(--muted)]">
                    <tr>
                      <th className="py-2 pr-4">Partito</th>
                      <th className="py-2 pr-4">%</th>
                      <th className="py-2 pr-4">IC</th>
                      <th className="py-2 pr-4">Swing</th>
                      <th className="py-2 pr-4">Camera</th>
                      <th className="py-2">Senato</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.nationalResults.map((r) => (
                      <tr
                        key={r.partySlug}
                        className="border-b border-[var(--border)]/60 transition hover:bg-white/[0.03]"
                      >
                        <td className="py-2.5 pr-4">
                          <span
                            className="mr-2 inline-block h-2.5 w-2.5 rounded-full"
                            style={{ background: r.color }}
                          />
                          {r.partyName}
                        </td>
                        <td className="py-2.5 pr-4 font-mono-data font-medium">
                          {formatPercent(r.percentage)}
                        </td>
                        <td className="py-2.5 pr-4 font-mono-data text-[var(--muted)]">
                          {formatPercent(r.percentageLow)}–{formatPercent(r.percentageHigh)}
                        </td>
                        <td
                          className={`py-2.5 pr-4 font-mono-data ${
                            r.swing >= 0
                              ? "text-[var(--it-green)]"
                              : "text-[var(--it-red)]"
                          }`}
                        >
                          {r.swing >= 0 ? "+" : ""}
                          {r.swing.toFixed(1)}
                        </td>
                        <td className="py-2.5 pr-4 font-mono-data">{r.seatsChamber}</td>
                        <td className="py-2.5 font-mono-data">{r.seatsSenate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mappa">
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <ItalyLeafletMap
                data={data.provincialMap}
                highlightSlug={data.candidate.partySlug}
              />
              <Card>
                <CardHeader>
                  <CardTitle>Province</CardTitle>
                </CardHeader>
                <CardContent className="max-h-[480px] space-y-3 overflow-y-auto">
                  {data.provincialMap
                    .filter((p) => p.winnerSlug === data.candidate.partySlug)
                    .slice(0, 25)
                    .map((p) => (
                      <div
                        key={p.provinceCode}
                        className="flex items-center justify-between border-b border-[var(--border)]/50 py-2 text-sm"
                      >
                        <span>{p.provinceName}</span>
                        <span className="font-mono-data font-medium">
                          {formatPercent(p.percentage)}
                        </span>
                      </div>
                    ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="territori">
            <Card>
              <CardContent className="pt-6">
                <ComuneTable
                  data={data.provincialMap}
                  highlightSlug={data.candidate.partySlug}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trend">
            <Card>
              <CardContent className="pt-6">
                <TrendTimeline
                  nationalResults={data.nationalResults}
                  scenarios={data.scenarios}
                  leaderSlug={data.candidate.partySlug}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="seggi" className="space-y-6">
            <Card>
              <CardContent className="pt-6">
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
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm font-mono-data">
                    <p>Camera {c.seatsChamber}</p>
                    <p>Senato {c.seatsSenate}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="candidato">
            <div className="grid gap-6 lg:grid-cols-2">
              {data.candidate.profile && (
                <Card>
                  <CardContent className="pt-6">
                    <CandidateRadar profile={data.candidate.profile} />
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardContent className="space-y-3 pt-6 text-sm text-[var(--muted)]">
                  {data.candidate.profile?.evidenceNotes.map((n, i) => (
                    <p key={i} className="border-l-2 border-[var(--it-red)]/50 pl-3">
                      {n}
                    </p>
                  ))}
                  <p className="text-white">{data.candidate.description}</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analisi">
            <Card>
              <CardContent className="pt-6">
                <article
                  className="prose-analysis max-w-none space-y-3 whitespace-pre-wrap text-sm leading-relaxed"
                  id="result"
                >
                  {data.analysis ?? "—"}
                </article>
              </CardContent>
            </Card>
          </TabsContent>

          {isFun && (
            <TabsContent value="bar">
              <Card id="fun-analysis" className="glow-chaos">
                <CardContent className="pt-6">
                  <article className="fun-analysis max-w-none whitespace-pre-wrap text-sm text-white/90">
                    {funAnalysis ?? "—"}
                  </article>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </motion.div>
    </motion.div>
  );
}

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass card-3d rounded-2xl p-5 sm:p-6">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="mt-1 font-mono-data text-3xl font-semibold text-[var(--it-blue)]">
        <AnimatedCounter value={value} />
      </p>
    </div>
  );
}
