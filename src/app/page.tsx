"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Swords } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div>
      <section className="hero-atmosphere relative overflow-hidden">
        <div className="italy-stripe absolute inset-x-0 top-0 h-1" />
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl flex-col items-center justify-center gap-8 px-4 py-16 text-center sm:px-6">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs uppercase tracking-[0.35em] text-[var(--muted)]"
          >
            Gioco politico italiano
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="font-[family-name:var(--font-display)] text-5xl leading-[1.05] text-[var(--it-blue)] sm:text-6xl"
          >
            Italia Elect Game
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="max-w-xl text-lg text-[var(--muted)]"
          >
            Scegli partito, candidato e programma. Sfida amici, i partiti reali o
            il computer. Simulazione realistica con mappa Italia e seggi.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap justify-center gap-3"
          >
            <Button asChild size="lg">
              <Link href="/gioco">
                <Swords className="mr-2 h-5 w-5" />
                Gioca ora
              </Link>
            </Button>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="grid w-full max-w-lg gap-3 sm:grid-cols-3"
          >
            {[
              { label: "Multiplayer", sub: "2–4 giocatori" },
              { label: "Single player", sub: "vs partiti reali" },
              { label: "Vs Computer", sub: "4 difficoltà" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/60 p-4"
              >
                <p className="text-sm font-semibold text-[var(--foreground)]">{item.label}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">{item.sub}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>
    </div>
  );
}
