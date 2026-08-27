# Italia Elect

Simulatore statistico delle **elezioni nazionali italiane**. Non è uno strumento di previsione certa: ogni risultato include intervalli di confidenza, variabili esplicitate e disclaimer metodologici.

## Stack

- Next.js 15 (App Router, Server Components, Server Actions)
- React 19 + TypeScript
- Tailwind CSS 4 + componenti stile shadcn/ui
- Framer Motion · Recharts · Leaflet-ready map layer
- TanStack Query · next-themes (dark mode)
- Vercel AI SDK + OpenAI (analisi testuale; fallback deterministico senza API key)
- PostgreSQL + Prisma 7

## Avvio rapido

```bash
cp .env.example .env
# configura DATABASE_URL e opzionalmente OPENAI_API_KEY

npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).

## Funzionalità

- Form candidato (nome, cognome, partito, descrizione, programma, foto)
- Motore Monte Carlo + prior bayesiano su baseline storiche
- Percentuali nazionali, Camera/Senato, coalizioni, probabilità di vittoria
- Mappa province con hover (partito, %, swing)
- Grafici: barre, swing, storico, radar, seggi
- Analisi motivata collegata ai dati
- Confronto fino a 6 scenari
- Dashboard storico, export PDF, link pubblico
- Pagina metodologia e job di refresh dati (`/api/electoral/refresh`)

## Architettura Intelligence (v2)

```
src/lib/intelligence/
  polls.ts                 Poll Aggregator
  economicModel.ts         Economic Sentiment Index
  newsAnalysis.ts          Event Impact Analysis
  socialAnalysis.ts        Social Momentum Score
  candidateRecognition.ts  Public Figure Intelligence
  candidateProfile.ts      Profilo IA candidato
  contextEngine.ts         Aggregatore pesi dinamici → Monte Carlo
```

Il Context Engine corregge la baseline storica con sondaggi, economia, eventi e social,
adatta i pesi al regime di scenario e passa il tutto al motore Monte Carlo (≥10.000 run).

## Note etiche e metodologiche

- Distinzione esplicita tra fatti pubblici e inferenze
- Nessuna attribuzione di fatti non verificati
- Segnalazione qualità dati insufficiente
- Fonti: Ministero dell'Interno / Eligendo (vedi `/metodologia`)

## Script utili

| Comando | Descrizione |
|---------|-------------|
| `npm run dev` | Dev server |
| `npm run build` | Build produzione |
| `npm run db:seed` | Popola storico elettorale |
| `npm run test:engine` | Smoke test motore |
| `npm run db:studio` | Prisma Studio |
