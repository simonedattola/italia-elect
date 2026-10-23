import type { Metadata } from "next";
import Link from "next/link";
import { dataCatalog } from "@/data/generated/registry";
import { formatPercent } from "@/lib/utils";
import type { ElectionLevel } from "@/lib/data/types";

export const metadata: Metadata = {
  title: "Archivio",
  description: "Scrutini italiani normalizzati da fonti pubbliche, con percentuali, seggi e note di copertura.",
};

const ORDER: ElectionLevel[] = ["nazionali", "europee", "regionali", "comunali"];
const LABELS: Record<ElectionLevel, string> = {
  nazionali: "Nazionali",
  europee: "Europee",
  regionali: "Regionali",
  comunali: "Comunali",
};

export default function ArchivePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-8 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--it-blue)]">Fonti aperte</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl sm:text-5xl">Archivio</h1>
        <p className="mt-3 text-[var(--muted)]">
          Ogni scheda riporta solo ciò che è nel file di origine. Dove i voti assoluti sono corrotti o assenti, il campo resta vuoto.
        </p>
      </header>
      <div className="space-y-10">
        {ORDER.map((level) => {
          const items = dataCatalog.elections
            .filter((item) => item.level === level)
            .slice()
            .sort((a, b) => b.year - a.year || a.title.localeCompare(b.title, "it"));
          if (items.length === 0) return null;
          return (
            <section key={level}>
              <h2 className="font-[family-name:var(--font-display)] text-3xl">{LABELS[level]}</h2>
              <ul className="mt-4 grid gap-3">
                {items.map((item) => (
                  <li key={item.id}>
                    <Link href={`/archivio/${item.id}`} className="hub-card block rounded-2xl p-4 sm:p-5">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h3 className="text-lg font-semibold">{item.title}</h3>
                        <span className="text-sm text-[var(--muted)]">
                          {item.date ?? item.year}
                          {item.turnout != null ? ` · affluenza ${formatPercent(item.turnout)}` : ""}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-[var(--muted)]">
                        {item.topLists.slice(0, 3).map((list) => `${list.name} ${formatPercent(list.percentage)}`).join(" · ")}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
      <section className="mt-12">
        <h2 className="font-[family-name:var(--font-display)] text-3xl">Cosa non c&apos;è</h2>
        <ul className="mt-4 space-y-3">
          {dataCatalog.gaps.map((gap) => (
            <li key={gap.level} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-sm">
              <p className="font-semibold capitalize">{gap.level}</p>
              <p className="mt-1 text-[var(--muted)]">{gap.detail}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
