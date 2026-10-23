import { formatPercent } from "@/lib/utils";

export interface ShareBar {
  id: string;
  name: string;
  color: string;
  mean: number;
  low: number;
  high: number;
}

export function ShareBars({ rows, caption }: { rows: ShareBar[]; caption: string }) {
  const max = Math.max(35, ...rows.map((row) => row.high));
  return (
    <figure>
      <figcaption className="mb-3 text-sm font-semibold">{caption}</figcaption>
      <ul className="space-y-2.5">
        {rows.map((row) => (
          <li key={row.id}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate font-medium">{row.name}</span>
              <span className="shrink-0 tabular-nums">
                {formatPercent(row.mean)}
                <span className="text-[var(--muted)]"> ({formatPercent(row.low)}–{formatPercent(row.high)})</span>
              </span>
            </div>
            <div className="relative h-2.5 rounded-full bg-[var(--surface)]" aria-hidden>
              <span
                className="absolute top-0 h-2.5 rounded-full opacity-30"
                style={{
                  background: row.color,
                  left: `${(row.low / max) * 100}%`,
                  width: `${Math.max(0, ((row.high - row.low) / max) * 100)}%`,
                }}
              />
              <span
                className="absolute top-0 h-2.5 rounded-full"
                style={{ background: row.color, width: `${(row.mean / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </figure>
  );
}
