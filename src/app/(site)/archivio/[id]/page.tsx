import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Hemicycle } from "@/components/charts/hemicycle";
import { ItalyRegionsMap } from "@/components/map/italy-regions-map";
import { dataCatalog, loadElection } from "@/data/generated/registry";
import { colorForList } from "@/lib/electoral/canonical";
import { formatNumber, formatPercent } from "@/lib/utils";

export function generateStaticParams() {
  return dataCatalog.elections.map((item) => ({ id: item.id }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const summary = dataCatalog.elections.find((item) => item.id === id);
  if (!summary) return { title: "Scrutinio" };
  return {
    title: summary.title,
    description: `${summary.title}. Dati da ${summary.source.provider}.`,
  };
}

export default async function ElectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const record = await loadElection(id);
  if (!record) notFound();

  const lists = record.lists.length
    ? record.lists
    : (record.municipalities ?? []).flatMap((place) => place.lists);
  const ranked = [...lists].sort((a, b) => b.percentage - a.percentage);
  const seated = ranked.filter((list) => (list.seats ?? 0) > 0);
  const paint = record.regions.map((region) => {
    const top = [...region.lists].sort((a, b) => b.percentage - a.percentage)[0];
    return {
      name: region.name,
      color: top ? colorForList(top.id) : "#d6d0c4",
      label: top ? `${top.name} ${formatPercent(top.percentage)}` : "n.d.",
    };
  });
  const places = record.municipalities ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <p className="text-sm">
        <Link className="font-semibold text-[var(--it-blue)] underline" href="/archivio">
          Archivio
        </Link>
      </p>
      <header className="mt-3 max-w-3xl">
        <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl">{record.title}</h1>
        <p className="mt-3 text-[var(--muted)]">
          {record.date ?? record.year} · {record.territory}
          {record.turnout != null ? ` · affluenza ${formatPercent(record.turnout)}` : ""}
        </p>
      </header>

      <dl className="mt-6 grid gap-3 sm:grid-cols-4">
        <Stat label="Elettori" value={record.electorate} />
        <Stat label="Votanti" value={record.voters} />
        <Stat label="Schede bianche" value={record.blankBallots} />
        <Stat label="Voti validi" value={record.validVotes} />
      </dl>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
          <h2 className="text-sm font-semibold">Liste</h2>
          <ul className="mt-3 space-y-2">
            {ranked.slice(0, 16).map((list) => (
              <li key={list.id}>
                <div className="flex justify-between gap-3 text-sm">
                  <span className="truncate">{list.name}</span>
                  <span className="tabular-nums">{formatPercent(list.percentage)}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-[var(--surface)]">
                  <div className="h-1.5 rounded-full" style={{ width: `${Math.min(100, list.percentage)}%`, background: colorForList(list.id) }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
        {seated.length > 0 ? (
          <Hemicycle
            label={`Seggi in archivio (${seated[0]?.seatsScope ?? "totale"})`}
            seats={seated.map((list) => ({ id: list.id, seats: list.seats ?? 0, color: colorForList(list.id) }))}
          />
        ) : (
          <p className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-sm text-[var(--muted)]">
            Questo file non pubblica un riparto di seggi utilizzabile. Le percentuali restano quelle della fonte.
          </p>
        )}
      </div>

      {paint.length > 0 ? (
        <div className="mt-6">
          <ItalyRegionsMap caption="Lista in testa nel territorio pubblicato" regions={paint} />
        </div>
      ) : null}

      {places.length > 0 ? (
        <section className="mt-8 overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="px-4 py-3 text-left font-semibold">
              {record.level === "regionali" ? "Province nel file" : "Comuni nel file"}
            </caption>
            <thead className="border-y border-[var(--border)] text-xs uppercase tracking-wide text-[var(--muted)]">
              <tr>
                <th className="px-4 py-2 font-medium">Territorio</th>
                <th className="px-3 py-2 font-medium">Affluenza</th>
                <th className="px-3 py-2 font-medium">Lista in testa</th>
                <th className="px-3 py-2 font-medium">Nota</th>
              </tr>
            </thead>
            <tbody>
              {places.map((place) => {
                const top = [...place.lists].sort((a, b) => b.percentage - a.percentage)[0];
                return (
                  <tr key={place.id} className="border-b border-[var(--border)] last:border-0">
                    <th className="px-4 py-2 font-medium" scope="row">{place.name}</th>
                    <td className="px-3 py-2 tabular-nums">{place.turnout != null ? formatPercent(place.turnout) : "—"}</td>
                    <td className="px-3 py-2">{top ? `${top.name} ${formatPercent(top.percentage)}` : "—"}</td>
                    <td className="px-3 py-2 text-[var(--muted)]">{place.note ?? ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ) : null}

      <section className="prose-analysis mt-8 max-w-3xl text-sm leading-relaxed">
        <h2>Copertura</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-[var(--muted)]">
          {record.coverageNotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
        <p className="mt-4">
          Fonte:{" "}
          <a className="font-semibold text-[var(--it-blue)] underline" href={record.source.url}>
            {record.source.provider}
          </a>
          . Scaricato il {record.source.retrievedAt}. {record.source.notes}
        </p>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
      <dt className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</dt>
      <dd className="mt-1 font-[family-name:var(--font-display)] text-2xl">{value == null ? "—" : formatNumber(value)}</dd>
    </div>
  );
}
