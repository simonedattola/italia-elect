interface SeatDot {
  id: string;
  color: string;
  seats: number;
}

export function Hemicycle({ seats, label }: { seats: SeatDot[]; label: string }) {
  const dots = seats.flatMap((seat) => Array.from({ length: seat.seats }, () => seat.color));
  const positions = layout(dots.length);
  const total = dots.length;
  return (
    <figure className="rounded-2xl border border-[var(--border)] bg-white p-4">
      <figcaption className="mb-2 text-sm font-semibold">{label}</figcaption>
      <svg viewBox="0 0 320 168" role="img" aria-label={`${label}: ${total} seggi`} className="w-full">
        <title>{label}</title>
        {dots.map((color, i) => (
          <circle key={`${color}-${i}`} cx={positions[i].x} cy={positions[i].y} r={total > 280 ? 2.15 : 3.1} fill={color}>
            <title>{color}</title>
          </circle>
        ))}
      </svg>
      <p className="text-xs text-[var(--muted)]">{total} seggi disegnati sulla media arrotondata delle estrazioni.</p>
    </figure>
  );
}

function layout(count: number): { x: number; y: number }[] {
  if (count <= 0) return [];
  const rows = count > 220 ? 8 : 6;
  const weights = Array.from({ length: rows }, (_, i) => i + 2);
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const counts: number[] = [];
  let assigned = 0;
  for (let row = 0; row < rows; row++) {
    const n = row === rows - 1 ? count - assigned : Math.max(1, Math.round((count * weights[row]) / weightSum));
    const take = Math.min(n, count - assigned);
    counts.push(take);
    assigned += take;
  }
  const points: { x: number; y: number }[] = [];
  counts.forEach((n, row) => {
    const radius = 38 + row * (count > 220 ? 13 : 16);
    for (let i = 0; i < n; i++) {
      const t = Math.PI * (1 - (i + 0.5) / n);
      points.push({ x: 160 + radius * Math.cos(t), y: 156 - radius * Math.sin(t) });
    }
  });
  return points;
}
