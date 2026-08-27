"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, LineChart, Map, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div>
      <section className="hero-atmosphere relative overflow-hidden">
        <div className="italy-stripe absolute inset-x-0 top-0 h-1" />
        <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:py-0">
          <div className="space-y-8">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-xs uppercase tracking-[0.35em] text-[var(--muted)]"
            >
              Simulatore statistico · Politica italiana
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="font-[family-name:var(--font-display)] text-5xl leading-[1.05] text-[var(--it-blue)] sm:text-6xl lg:text-7xl"
            >
              Italia Elect
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.15 }}
              className="max-w-xl text-lg text-[var(--muted)] sm:text-xl"
            >
              Inserisci un candidato e ottieni una simulazione nazionale
              realistica: percentuali, seggi, mappa provinciale e intervalli di
              confidenza — non una previsione certa.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.28 }}
              className="flex flex-wrap gap-3"
            >
              <Button asChild size="lg">
                <Link href="/simula">
                  Avvia simulazione <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/metodologia">Come funziona</Link>
              </Button>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative hidden lg:block"
            aria-hidden
          >
            <div className="absolute -inset-8 rounded-full bg-[var(--it-blue)]/10 blur-3xl" />
            <HeroVisual />
          </motion.div>
        </div>
      </section>

      <section className="border-t border-[var(--border)] bg-[var(--card)] py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 md:grid-cols-3">
          <Feature
            icon={<LineChart className="h-5 w-5" />}
            title="Motore statistico"
            text="Bayesian updating, Monte Carlo e allocazione seggi su baseline storiche Eligendo."
          />
          <Feature
            icon={<Map className="h-5 w-5" />}
            title="Mappa e grafici"
            text="Province colorate, swing, radar candidato, Camera e Senato, coalizioni."
          />
          <Feature
            icon={<Shield className="h-5 w-5" />}
            title="Trasparenza"
            text="Intervalli di confidenza, fonti documentate, distinzione fatti/inferenze."
          />
        </div>
      </section>
    </div>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45 }}
      className="space-y-3"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--it-blue)]/10 text-[var(--it-blue)]">
        {icon}
      </div>
      <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--foreground)]">
        {title}
      </h2>
      <p className="text-sm leading-relaxed text-[var(--muted)]">{text}</p>
    </motion.div>
  );
}

function HeroVisual() {
  return (
    <svg viewBox="0 0 400 480" className="relative w-full drop-shadow-xl">
      <rect
        x="40"
        y="40"
        width="320"
        height="400"
        rx="24"
        fill="var(--card)"
        stroke="var(--border)"
      />
      <text
        x="70"
        y="90"
        fill="var(--it-blue)"
        style={{ fontFamily: "var(--font-display)", fontSize: 28 }}
      >
        Scenario nazionale
      </text>
      <text x="70" y="118" fill="var(--muted)" style={{ fontSize: 12 }}>
        Monte Carlo · IC 80%
      </text>
      {[
        { y: 160, w: 220, c: "#003399", l: "FdI 27.4%" },
        { y: 200, w: 170, c: "#E31C2B", l: "PD 21.1%" },
        { y: 240, w: 130, c: "#FFED00", l: "M5S 14.2%" },
        { y: 280, w: 95, c: "#00A651", l: "Lega 9.8%" },
        { y: 320, w: 85, c: "#0087DC", l: "FI 8.6%" },
      ].map((b) => (
        <g key={b.l}>
          <rect x="70" y={b.y} width={b.w} height="22" rx="4" fill={b.c} opacity={0.9} />
          <text x="78" y={b.y + 15} fill="#fff" style={{ fontSize: 11, fontWeight: 600 }}>
            {b.l}
          </text>
        </g>
      ))}
      <circle cx="300" cy="380" r="36" fill="var(--it-red)" opacity={0.9} />
      <text
        x="300"
        y="385"
        textAnchor="middle"
        fill="#fff"
        style={{ fontSize: 14, fontWeight: 700 }}
      >
        62%
      </text>
    </svg>
  );
}
