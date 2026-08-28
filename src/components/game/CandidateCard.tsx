"use client";

import type { CandidateGameProfile } from "@/lib/game/types";

export function CandidateCard({ profile }: { profile: CandidateGameProfile }) {
  return (
    <div className="glass flex items-center gap-4 rounded-xl p-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--it-blue)]/20 text-xl font-bold text-white">
        {profile.firstName[0]}
        {profile.lastName[0]}
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="font-semibold text-[var(--foreground)]">{profile.name}</h4>
        <p className="text-xs text-[var(--muted)]">
          Popolarità {profile.popularity}/100 · Compat {profile.compatibility}%
        </p>
        <div className="mt-1 flex flex-wrap gap-2 text-[10px]">
          <span className="rounded-full bg-white/10 px-2 py-0.5">{profile.positionLabel}</span>
          {profile.isPublicFigure && (
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-emerald-300">
              Figura pubblica
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
