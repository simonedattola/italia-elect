"use client";

import type { CandidateGameProfile } from "@/lib/game/types";

export function CandidateCard({
  profile,
  loading,
}: {
  profile: CandidateGameProfile | null;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="glass animate-pulse rounded-xl p-4">
        <p className="text-sm text-[var(--muted)]">Analisi candidato in corso…</p>
      </div>
    );
  }
  if (!profile) return null;

  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--it-blue)] text-xl font-bold text-white">
          {profile.firstName[0]}
          {profile.lastName[0]}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold text-[var(--foreground)]">{profile.name}</h4>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Popolarità {profile.popularity}/100 · Compatibilità {profile.compatibility}%
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-[10px] font-medium">
              {profile.positionLabel}
            </span>
            {profile.isPublicFigure && (
              <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
                Figura pubblica
              </span>
            )}
            {(profile.textSwingPts ?? 0) > 0.5 && (
              <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] text-blue-800">
                Testo +{profile.textSwingPts!.toFixed(1)}pp
              </span>
            )}
            {(profile.textSwingPts ?? 0) < -0.5 && (
              <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] text-red-800">
                Testo {profile.textSwingPts!.toFixed(1)}pp
              </span>
            )}
          </div>
          {profile.themes && profile.themes.length > 0 && (
            <p className="mt-2 text-[11px] text-[var(--muted)]">
              Temi: {profile.themes.slice(0, 4).join(", ")}
            </p>
          )}
          <p className="mt-2 text-xs leading-relaxed text-[var(--foreground)]">
            {profile.programSummary}
          </p>
          {profile.recognitionNote && (
            <p className="mt-1 text-[10px] text-[var(--muted)]">{profile.recognitionNote}</p>
          )}
          {profile.vicePresidentEffect !== 0 && (
            <p className="mt-1 text-[10px] text-[var(--muted)]">
              Effetto vicepresidente: {profile.vicePresidentEffect > 0 ? "+" : ""}
              {profile.vicePresidentEffect.toFixed(1)}pp
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
