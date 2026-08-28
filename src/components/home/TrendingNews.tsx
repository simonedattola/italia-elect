"use client";

const TRENDING = [
  { label: "Futuro Nazionale", delta: 2.1, up: true },
  { label: "Lega", delta: -1.0, up: false },
  { label: "Economia", delta: 0.8, up: true, factor: true },
  { label: "Sicurezza", delta: -0.5, up: false, factor: true },
];

const NEWS = [
  "Meloni: «Tax credit per le imprese»",
  "Schlein: «Sanità pubblica priorità»",
  "Conte: «Reddito di cittadinanza 2.0»",
  "Salvini: «Blocchi navali»",
];

export function TrendingNews() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="glass rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white">Trending</h3>
        <ul className="mt-4 space-y-3">
          {TRENDING.map((t) => (
            <li key={t.label} className="flex justify-between text-sm">
              <span className="text-[var(--muted)]">
                {t.factor ? "⬆" : t.up ? "➕" : "➖"} {t.label}
              </span>
              <span
                className={`font-mono-data ${
                  t.up ? "text-[var(--it-green)]" : "text-[var(--it-red)]"
                }`}
              >
                {t.up ? "+" : ""}
                {t.delta}%
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="glass rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white">Ultime notizie</h3>
        <ul className="mt-4 space-y-3 text-sm text-[var(--muted)]">
          {NEWS.map((n) => (
            <li key={n} className="border-l-2 border-[var(--it-blue)]/40 pl-3">
              {n}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
