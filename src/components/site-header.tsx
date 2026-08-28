"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/simula", label: "Simula" },
  { href: "/sfida", label: "Sfida" },
  { href: "/scenario-casuale", label: "Scenario" },
  { href: "/crea-partito", label: "Crea partito" },
  { href: "/what-if", label: "What-if" },
  { href: "/storia", label: "Storia" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-4 px-4 sm:max-w-5xl sm:px-6 lg:max-w-6xl lg:px-8">
        <Link
          href="/"
          className="text-[15px] font-semibold tracking-tight text-white"
          onClick={() => setOpen(false)}
        >
          Italia Elect
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                pathname === l.href || pathname.startsWith(l.href + "/")
                  ? "text-white"
                  : "text-[var(--muted)] hover:text-white",
              )}
            >
              {l.label}
            </Link>
          ))}
          <ThemeToggle />
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            aria-label="Menu"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {open && (
        <nav
          className="border-t border-[var(--border)] bg-[var(--background)] px-4 py-3 md:hidden"
          aria-label="Menu principale"
        >
          <ul className="space-y-1">
            {navLinks.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "block rounded-md px-3 py-2.5 text-sm",
                    pathname === l.href
                      ? "bg-[var(--surface)] text-white"
                      : "text-[var(--muted)]",
                  )}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <Button asChild className="mt-4 w-full" size="lg">
            <Link href="/simula" onClick={() => setOpen(false)}>
              Simula
            </Link>
          </Button>
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--border)]">
      <div className="mx-auto flex max-w-3xl px-4 py-6 text-xs text-[var(--muted)] sm:max-w-5xl sm:px-6 lg:max-w-6xl lg:px-8">
        © {new Date().getFullYear()}
      </div>
    </footer>
  );
}
