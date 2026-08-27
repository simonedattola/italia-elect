import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

const links = [
  { href: "/simula", label: "Simula" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/confronto", label: "Confronto" },
  { href: "/metodologia", label: "Metodologia" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)]/80 bg-[var(--background)]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="group flex items-baseline gap-2">
          <span className="font-[family-name:var(--font-display)] text-xl tracking-tight text-[var(--it-blue)] sm:text-2xl">
            Italia Elect
          </span>
          <span className="hidden text-[10px] uppercase tracking-[0.2em] text-[var(--muted)] sm:inline">
            Simulatore
          </span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-2.5 py-1.5 text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
            >
              {l.label}
            </Link>
          ))}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-10 text-sm text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          © {new Date().getFullYear()} Italia Elect — simulatore statistico, non
          previsione certa.
        </p>
        <div className="flex gap-4">
          <Link href="/metodologia" className="hover:text-[var(--foreground)]">
            Fonti e metodo
          </Link>
          <Link href="/simula" className="hover:text-[var(--foreground)]">
            Nuova simulazione
          </Link>
        </div>
      </div>
    </footer>
  );
}
