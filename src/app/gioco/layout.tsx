import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Gioco",
  description: "Partita tra amici con liste inventate, contro il computer o a livelli. Motore illustrativo, separato dall'archivio.",
};

export default function GiocoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="experiment-root min-h-screen">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-2 text-xs text-[var(--muted)]">
        <Link href="/" className="font-semibold text-[var(--foreground)]">
          Italia Elect
        </Link>
        <a className="underline-offset-2 hover:underline" href="https://vexastudio.it" rel="noopener noreferrer">
          Sviluppato da Vexa Studio
        </a>
      </div>
      <main>{children}</main>
    </div>
  );
}
