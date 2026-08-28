"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  BarChart3,
  Dice5,
  FlaskConical,
  HelpCircle,
  Landmark,
  Swords,
} from "lucide-react";

const experiences = [
  {
    href: "/simula",
    icon: FlaskConical,
    title: "Analista",
    desc: "Simula professionale con cabina di regia",
    color: "var(--it-blue)",
    purple: false,
  },
  {
    href: "/gioco",
    icon: Swords,
    title: "Gioco",
    desc: "Multiplayer, single player, vs AI",
    color: "var(--it-green)",
    purple: true,
  },
  {
    href: "/sfida",
    icon: Swords,
    title: "Sfida 1v1",
    desc: "Sfida un amico con due candidati",
    color: "var(--chaos)",
    purple: true,
  },
  {
    href: "/scenario-casuale",
    icon: Dice5,
    title: "Casuale",
    desc: "Scenario random con shock al voto",
    color: "var(--chaos)",
    purple: true,
  },
  {
    href: "/crea-partito",
    icon: Landmark,
    title: "Crea Partito",
    desc: "Crea il tuo movimento politico",
    color: "var(--it-green)",
    purple: false,
  },
  {
    href: "/what-if",
    icon: HelpCircle,
    title: "What-If",
    desc: "Cosa succede se…?",
    color: "var(--accent-ai)",
    purple: true,
  },
  {
    href: "/storia",
    icon: BarChart3,
    title: "Storia",
    desc: "Trend politico dal 1946",
    color: "var(--it-blue)",
    purple: false,
  },
];

export function ExperienceHub() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {experiences.map((exp, i) => (
        <motion.div
          key={exp.href}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.06 }}
        >
          <Link
            href={exp.href}
            className={`hub-card group block p-5 ${exp.purple ? "hub-card-purple" : ""}`}
          >
            <exp.icon
              className="h-6 w-6 transition-transform duration-300 group-hover:scale-110"
              style={{ color: exp.color }}
            />
            <h3 className="mt-3 text-sm font-semibold text-white">{exp.title}</h3>
            <p className="mt-1 text-xs text-[var(--muted)] leading-relaxed">{exp.desc}</p>
            <span className="mt-3 text-xs font-medium text-[var(--it-blue)] group-hover:text-white">
              Entra →
            </span>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
