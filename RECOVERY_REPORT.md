# Italia Elect — Transcript Recovery Report

**Source transcript:** `/tmp/cursor/cloud-agent-transcripts/2026-08-27T13-57-12Z-fdfc/bc-019fcef5-fb42-777a-b385-c671bf4f3c1e/transcript.json`  
**Method:** Chronological replay of `search_replace` unified diffs + full `read_file` snapshots + shell heredoc writes + mid-run `package.json` shell dump. Unmodified Next.js 15.5.22 scaffold configs (`eslint.config.mjs`, `postcss.config.mjs`, `next-env.d.ts`, `public/*`) restored from the same `create-next-app` version used in the original run.

## Recovery success

| Metric | Value |
|--------|-------|
| Recovered project files (excl. `node_modules`) | **91** |
| Application/source files under `src/` | **66** |
| `tsc --noEmit` | **pass (0 errors)** |
| `npm install` + `prisma generate` | **success** |
| Missing `@/` / relative imports | **none detected** |

## Recovered paths

```
.env
.env.example
.gitignore
README.md
eslint.config.mjs
next-env.d.ts
next.config.ts
package.json
package-lock.json
postcss.config.mjs
prisma.config.ts
prisma/schema.prisma
prisma/seed.ts
public/file.svg
public/globe.svg
public/next.svg
public/vercel.svg
public/window.svg
candidate-cache/.gitkeep
scripts/e2e-sim.ts
scripts/sim-italia-domani.ts
scripts/test-compatibility.ts
scripts/test-engine.ts
scripts/test-recognition.ts
src/actions/compare.ts
src/actions/data.ts
src/actions/simulate.ts
src/app/api/electoral/refresh/route.ts
src/app/condividi/[shareSlug]/page.tsx
src/app/confronto/[slug]/page.tsx
src/app/confronto/page.tsx
src/app/dashboard/page.tsx
src/app/globals.css
src/app/layout.tsx
src/app/metodologia/page.tsx
src/app/page.tsx
src/app/risultati/[slug]/page.tsx
src/app/simula/page.tsx
src/components/charts/election-charts.tsx
src/components/map/italy-map.tsx
src/components/providers.tsx
src/components/simulation/compare-picker.tsx
src/components/simulation/results-view.tsx
src/components/simulation/simulation-form.tsx
src/components/site-header.tsx
src/components/theme-toggle.tsx
src/components/ui/button.tsx
src/components/ui/card.tsx
src/components/ui/input.tsx
src/components/ui/tabs.tsx
src/lib/ai/analysis.ts
src/lib/ai/generate.ts
src/lib/electoral/historical.ts
src/lib/electoral/ingest.ts
src/lib/electoral/parties.ts
src/lib/electoral/provinces.ts
src/lib/electoral/sample-programs.ts
src/lib/export/pdf.ts
src/lib/intelligence/candidateProfile.ts
src/lib/intelligence/candidateRecognition.ts
src/lib/intelligence/candidateRecognitionTypes.ts
src/lib/intelligence/contextEngine.ts
src/lib/intelligence/economicModel.ts
src/lib/intelligence/electoralCompatibility.ts
src/lib/intelligence/index.ts
src/lib/intelligence/newsAnalysis.ts
src/lib/intelligence/polls.ts
src/lib/intelligence/publicFigure/cache.ts
src/lib/intelligence/publicFigure/dbpedia.ts
src/lib/intelligence/publicFigure/engine.ts
src/lib/intelligence/publicFigure/entityResolution.ts
src/lib/intelligence/publicFigure/index.ts
src/lib/intelligence/publicFigure/institutional.ts
src/lib/intelligence/publicFigure/knowledgeBase.ts
src/lib/intelligence/publicFigure/personalBrand.ts
src/lib/intelligence/publicFigure/retrieval.ts
src/lib/intelligence/publicFigure/synthesize.ts
src/lib/intelligence/publicFigure/types.ts
src/lib/intelligence/publicFigure/wikidata.ts
src/lib/intelligence/publicFigure/wikipedia.ts
src/lib/intelligence/socialAnalysis.ts
src/lib/json.ts
src/lib/prisma.ts
src/lib/simulation/candidate-profile.ts
src/lib/simulation/coalitions.ts
src/lib/simulation/engine.ts
src/lib/simulation/seats.ts
src/lib/utils.ts
src/types/intelligence.ts
src/types/simulation.ts
tsconfig.json
```

## Important missing paths

Detected from original agent activity / listings, **not reconstructible** from transcript contents:

| Path | Why missing | Impact |
|------|-------------|--------|
| `prisma/migrations/20260804225118_init/` | Created by `prisma migrate`, SQL never written via editor tools | Use `npx prisma db push` or re-run migrate from schema |
| `prisma/migrations/20260804233151_context_intelligence/` | Same | Same |
| `prisma/migrations/migration_lock.toml` | Same | Same |
| `candidate-cache/*.json` (11 politician caches) | Runtime-generated; only ephemeral test caches were partially read | Regenerated on recognition at runtime |
| `src/app/favicon.ico` | Binary from scaffold; not in transcript | Cosmetic; Next default OK |

Intentionally **not** kept in final tree:

- `scripts/debug-compat.ts`, `scripts/debug-compat2.ts` (deleted in original session)
- `candidate-cache/adolf-hitler.json` (explicitly `rm -f`’d)

## Bootability assessment

**Mostly bootable for development**, with caveats:

1. **Typecheck:** `npx tsc --noEmit` passes.
2. **Deps / Prisma client:** `npm install` succeeds; `prisma generate` succeeds against recovered `schema.prisma` (15 models).
3. **Database:** No migration SQL recovered. Needs a running PostgreSQL and either `prisma db push` or fresh `prisma migrate dev`, then `npm run db:seed`.
4. **Runtime:** `OPENAI_API_KEY` optional per README/env comments; app can run statistical engine without it. Set `DATABASE_URL` in `.env` (local template recovered; `.env` is gitignored).
5. **Dev server:** Not fully exercised end-to-end here (no DB in this recovery pass), but project structure and types look coherent.

## Git recommendation

**Yes — `git init` + commit + push makes sense** to preserve this recovered tree as a new baseline. Suggested first steps after init:

- Keep `.env` out of git (already in `.gitignore`; commit `.env.example`)
- Commit recovered source + `package-lock.json`
- Do **not** commit `node_modules/`
- Recreate migrations with Prisma against a real DB before treating the repo as production-ready
