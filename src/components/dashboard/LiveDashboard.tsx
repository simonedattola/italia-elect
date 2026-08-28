"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, TrendingUp, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PARTIES } from "@/lib/electoral/parties";

interface DashboardSnapshot {
  date: string;
  collectedAt: string;
  weightsUpdatedAt: string;
  virtualPopulation: number;
  agentSampleSize: number;
  votingIntent: Record<string, number>;
  confidenceLow: Record<string, number>;
  confidenceHigh: Record<string, number>;
  parties: Array<{ slug: string; name: string; pct: number; aiDetected?: boolean }>;
  socialImpactByAge: Record<string, number>;
  meloniPostImpact: { follower: number; nonFollower: number };
}

export function LiveDashboard() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.snapshot) setSnapshot(data.snapshot);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="border-y border-[var(--border)] bg-black/15 py-16">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-[var(--muted)] sm:px-6 lg:px-8">
          Caricamento intenzioni di voto live…
        </div>
      </section>
    );
  }

  if (!snapshot) return null;

  const topParties = Object.entries(snapshot.votingIntent)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);

  const aiParties = snapshot.parties.filter((p) => p.aiDetected);
  const updatedAt = new Date(snapshot.weightsUpdatedAt).toLocaleString("it-IT", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <section className="border-y border-[var(--border)] bg-black/15 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-2xl font-semibold text-white sm:text-3xl"
            >
              Cruscotto live
            </motion.h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {snapshot.agentSampleSize.toLocaleString("it-IT")} agenti campione ·{" "}
              {(snapshot.virtualPopulation / 1_000_000).toFixed(0)}M virtuali · refresh
              orario
            </p>
          </div>
          <Badge variant="outline" className="border-[var(--it-blue)]/40 text-[var(--it-blue)]">
            Pesi aggiornati al {updatedAt}
          </Badge>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass rounded-2xl p-6 sm:p-8"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <TrendingUp className="h-4 w-4 text-[var(--it-green)]" />
              Intenzioni di voto nazionali
            </div>
            <ul className="mt-6 space-y-3">
              {topParties.map(([slug, pct]) => {
                const party = PARTIES.find((p) => p.slug === slug);
                const low = snapshot.confidenceLow[slug];
                const high = snapshot.confidenceHigh[slug];
                return (
                  <li key={slug} className="flex items-center gap-3">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: party?.color ?? "#64748b" }}
                    />
                    <span className="min-w-[5rem] text-sm text-white">
                      {party?.shortName ?? slug}
                    </span>
                    <div className="flex-1">
                      <div
                        className="h-2 rounded-full bg-white/5"
                        style={{
                          background: `linear-gradient(90deg, ${party?.color ?? "#64748b"} ${pct}%, transparent ${pct}%)`,
                        }}
                      />
                    </div>
                    <span className="font-mono-data text-sm font-medium text-white">
                      {pct.toFixed(1)}%
                    </span>
                    {low != null && high != null && (
                      <span className="text-[10px] text-[var(--muted)]">
                        IC {low.toFixed(1)}–{high.toFixed(1)}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </motion.div>

          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.05 }}
              className="glass rounded-2xl p-6"
            >
              <div className="flex items-center gap-2 text-sm font-medium text-white">
                <Users className="h-4 w-4 text-[var(--accent-ai)]" />
                Influenza social (Meloni)
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-white/5 p-4 text-center">
                  <p className="text-xs text-[var(--muted)]">Agente #1 · segue</p>
                  <p className="mt-1 font-mono-data text-2xl font-semibold text-white">
                    {snapshot.meloniPostImpact.follower.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-xl bg-white/5 p-4 text-center">
                  <p className="text-xs text-[var(--muted)]">Agente #2 · non segue</p>
                  <p className="mt-1 font-mono-data text-2xl font-semibold text-white">
                    {snapshot.meloniPostImpact.nonFollower.toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {Object.entries(snapshot.socialImpactByAge).map(([band, impact]) => (
                  <div key={band} className="flex justify-between text-xs">
                    <span className="text-[var(--muted)]">{band} anni</span>
                    <span className="font-mono-data text-white">{impact.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {aiParties.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="glass rounded-2xl p-6"
              >
                <div className="flex items-center gap-2 text-sm font-medium text-white">
                  <Sparkles className="h-4 w-4 text-[var(--chaos)]" />
                  Partiti rilevati automaticamente
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {aiParties.map((p) => (
                    <Badge
                      key={p.slug}
                      className="border-[var(--chaos)]/30 bg-[var(--chaos)]/10 text-[var(--accent-ai)]"
                    >
                      {p.name} · {(snapshot.votingIntent[p.slug] ?? p.pct).toFixed(1)}%
                    </Badge>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
