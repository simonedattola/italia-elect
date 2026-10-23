import { PassAndPlay } from "@/components/game/loop/PassAndPlay";

export const metadata = {
  title: "Passa il telefono",
  description: "Due giocatori, un telefono: ballottaggio, regione, coalizioni, duello a turni o draft.",
};

const MODES = ["ballottaggio", "regionale", "nazionali", "duello", "draft"] as const;

export default async function LocalePage({
  searchParams,
}: {
  searchParams: Promise<{ caso?: string; s?: string; mode?: string }>;
}) {
  const params = await searchParams;
  if (params.s) {
    return <SharedResult encoded={params.s} />;
  }
  const initialMode = MODES.find((mode) => mode === params.mode);
  return <PassAndPlay demo={params.caso} initialMode={initialMode} />;
}

function SharedResult({ encoded }: { encoded: string }) {
  let payload: { label?: string; players?: { name: string; party: string; percentage: number; score: number }[]; notes?: string[] } | null = null;
  try {
    payload = JSON.parse(decodeURIComponent(escape(atob(encoded))));
  } catch {
    payload = null;
  }
  if (!payload?.players) {
    return <p className="mx-auto max-w-lg px-4 py-16 text-sm">Questo link non contiene una partita leggibile.</p>;
  }
  return (
    <section className="mx-auto max-w-lg px-4 py-10">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Risultato condiviso</p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl">{payload.label ?? "Partita"}</h1>
      <ul className="mt-6 space-y-3">
        {payload.players.map((player) => (
          <li key={player.name} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
            <p className="text-lg font-semibold">{player.name}</p>
            <p className="text-sm text-[var(--muted)]">{player.party}</p>
            <p className="mt-2 text-3xl">{player.percentage.toFixed(1)}%</p>
            <p className="text-sm text-[var(--muted)]">Punteggio {player.score}</p>
          </li>
        ))}
      </ul>
      {payload.notes?.map((note) => (
        <p key={note} className="mt-4 text-sm leading-relaxed">{note}</p>
      ))}
    </section>
  );
}
