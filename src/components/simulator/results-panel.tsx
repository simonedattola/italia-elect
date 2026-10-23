import type { SimulationOutput } from "@/lib/model/engine";
import { formatPercent } from "@/lib/utils";
import { Hemicycle } from "@/components/charts/hemicycle";
import { ShareBars } from "@/components/charts/share-bars";
import { ItalyRegionsMap } from "@/components/map/italy-regions-map";

export function ResultsPanel({
  result,
  regionPaint,
}: {
  result: SimulationOutput;
  regionPaint?: { name: string; color: string; label: string }[];
}) {
  const colors = new Map(result.shares.map((share) => [share.id, share.color]));
  const names = new Map(result.shares.map((share) => [share.id, share.name]));
  const seatRows = [...result.cameraSeats].sort((a, b) => b.mean - a.mean).filter((row) => row.mean >= 0.2);
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        {result.coalitions.slice(0, 3).map((coalition) => (
          <article key={coalition.id} className="rounded-2xl border border-[var(--border)] bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{coalition.name}</p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-3xl">{formatPercent(coalition.probability * 100, 0)}</p>
            <p className="text-sm text-[var(--muted)]">
              probabilità di maggioranza · {coalition.meanSeats.toFixed(1)} seggi medi
            </p>
          </article>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <ShareBars
          caption="Percentuali, media e intervallo 5–95"
          rows={result.shares.filter((row) => row.mean >= 0.4).slice(0, 12)}
        />
        <Hemicycle
          label={result.meta.level === "nazionali" ? "Camera, seggi attesi" : "Seggi attesi"}
          seats={result.hemicycle.map((seat) => ({
            id: seat.id,
            seats: seat.seats,
            color: colors.get(seat.id) ?? "#94a3b8",
          }))}
        />
      </div>
      {regionPaint && regionPaint.length > 0 ? (
        <ItalyRegionsMap caption="Proiezione territoriale sulla media (Senato 2022 più lo swing nazionale)" regions={regionPaint} />
      ) : null}
      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <caption className="px-4 py-3 text-left font-semibold">Seggi per lista</caption>
          <thead className="border-y border-[var(--border)] text-xs uppercase tracking-wide text-[var(--muted)]">
            <tr>
              <th className="px-4 py-2 font-medium">Lista</th>
              <th className="px-3 py-2 font-medium">Quota</th>
              <th className="px-3 py-2 font-medium">Proporzionale</th>
              <th className="px-3 py-2 font-medium">Uninominale</th>
              <th className="px-3 py-2 font-medium">Senato</th>
            </tr>
          </thead>
          <tbody>
            {seatRows.map((row) => (
              <tr key={row.id} className="border-b border-[var(--border)] last:border-0">
                <th className="px-4 py-2 font-medium" scope="row">{names.get(row.id)}</th>
                <td className="px-3 py-2 tabular-nums">{row.mean.toFixed(1)} <span className="text-[var(--muted)]">({row.low.toFixed(0)}–{row.high.toFixed(0)})</span></td>
                <td className="px-3 py-2 tabular-nums">{row.proportionalMean.toFixed(1)}</td>
                <td className="px-3 py-2 tabular-nums">{row.uninominalMean.toFixed(1)}</td>
                <td className="px-3 py-2 tabular-nums">{(result.senateSeats.find((s) => s.id === row.id)?.mean ?? 0).toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="space-y-1 text-sm text-[var(--muted)]">
        {result.notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
        {result.meta.method.map((note) => (
          <li key={note}>{note}</li>
        ))}
        <li>Seme {result.meta.seed}, {result.meta.runs} estrazioni, sigma {result.meta.sigma} punti. Soglia di maggioranza usata: {result.meta.majorityThreshold} seggi.</li>
      </ul>
    </div>
  );
}
