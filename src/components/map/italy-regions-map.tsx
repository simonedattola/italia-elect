import map from "@/data/generated/italy-regions.json";

export interface RegionPaint {
  name: string;
  color: string;
  label: string;
}

export function ItalyRegionsMap({
  regions,
  caption,
}: {
  regions: RegionPaint[];
  caption: string;
}) {
  const byName = new Map(regions.map((region) => [region.name, region]));
  return (
    <figure className="rounded-2xl border border-[var(--border)] bg-[#f4efe4] p-3">
      <figcaption className="mb-2 text-sm font-semibold">{caption}</figcaption>
      <svg viewBox={map.viewBox} role="img" aria-label={caption} className="mx-auto h-auto w-full max-w-md">
        {map.regions.map((region) => {
          const paint = byName.get(region.name);
          return (
            <path
              key={region.name}
              d={region.d}
              fill={paint?.color ?? "#d6d0c4"}
              stroke="#091627"
              strokeWidth={1.2}
            >
              <title>{paint ? `${region.name}: ${paint.label}` : `${region.name}: dato assente`}</title>
            </path>
          );
        })}
      </svg>
      <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs sm:grid-cols-3">
        {regions.map((region) => (
          <li key={region.name} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: region.color }} aria-hidden />
            <span className="truncate">
              {region.name}
              <span className="text-[var(--muted)]"> · {region.label}</span>
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
