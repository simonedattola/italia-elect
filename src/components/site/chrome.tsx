import Link from "next/link";

const LINKS = [
  { href: "/simulatore", label: "Simulatore" },
  { href: "/archivio", label: "Archivio" },
  { href: "/gioco", label: "Gioco" },
  { href: "/metodologia", label: "Metodologia" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[#091627]/90 backdrop-blur-md">
      <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2 sm:px-6">
        <Link href="/" className="group min-w-0">
          <span className="font-[family-name:var(--font-display)] text-2xl leading-none text-[var(--it-blue)]">
            Italia Elect
          </span>
          <span className="mt-0.5 block text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
            Archivi e simulazioni
          </span>
        </Link>
        <nav aria-label="Sezioni" className="flex flex-wrap items-center justify-end gap-1">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-2 py-1.5 text-sm font-medium text-[var(--foreground)] hover:bg-white/10 sm:px-3"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-[var(--border)] bg-[#0b121e]">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          © {new Date().getFullYear()} Italia Elect ·{" "}
          <a className="font-semibold text-[var(--it-blue)] underline-offset-2 hover:underline" href="https://vexastudio.it" rel="noopener noreferrer">
            Sviluppato da Vexa Studio
          </a>
        </p>
        <p>I numeri ufficiali restano quelli del Ministero. Il modello è uno scenario, non un pronostico.</p>
      </div>
    </footer>
  );
}
