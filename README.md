# Italia Elect

Archivio degli scrutini italiani e simulatore di scenario, con un gioco separato per le partite tra amici. L'interfaccia è in italiano. Il credito è «Sviluppato da Vexa Studio» ([vexastudio.it](https://vexastudio.it)).

Non serve un database. I numeri in `src/data/generated` sono prodotti dallo script di ingest e versionati. Dove una fonte non c'è, il campo resta vuoto: il modello non inventa scrutini.

## Cosa fa

- **Archivio** (`/archivio`): Costituente e Camera 1946–2022 dal bollettino compilato, microdati Camera e Senato 2022, europee 2024, regionali Lazio e Lombardia 2023, il comune presente nel CSV del 28 luglio 2024.
- **Simulatore** (`/simulatore`): politiche con il Rosatellum vigente (seggi proporzionali e uninominali), europee, regionali parametriche, comunali sopra i 15.000 abitanti. Monte Carlo con intervallo 5–95, mappa e emiciclo.
- **Gioco** (`/gioco`): liste inventate, contro il computer, a livelli. Usa un motore illustrativo diverso dall'archivio.
- **Link** (`/condividi?s=`): lo scenario sta nel query string, senza account.

La pagina [Metodologia](/metodologia) descrive soglie, Hare, swing uninominale, elasticità e i buchi di copertura.

## Avvio

```bash
npm install
cp .env.example .env.local   # facoltativo: l'app parte anche senza
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).

```bash
npm test          # riparto, Monte Carlo, catalogo
npm run test:game # motore illustrativo del gioco
npm run build
```

Node 22. Il runtime delle route è Node.js, non Edge.

## Variabili

Nessuna è obbligatoria. Senza le URL esterne i fattori restano a zero e i sondaggi dimostrativi restano spenti.

| Variabile | Ruolo |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Base di metadata, sitemap e Open Graph. In locale `http://localhost:3000`. |
| `POLLS_JSON_URL` | JSON `{ "polls": [...] }`. Peso: recenza (emivita 21 giorni), radice del campione, affidabilità. House effect solo se il record lo dichiara. |
| `POLLS_API_KEY` | Bearer verso `POLLS_JSON_URL`, se il fornitore lo chiede. |
| `NEWS_API_URL` | JSON `{ "economy", "security", "europe", "costOfLiving" }` fra −2 e 2. Si applica solo dal pulsante nel simulatore. |
| `NEWS_API_KEY` | Bearer verso la fonte notizie. |
| `SOCIAL_API_URL` | JSON `{ "score" }` fra −1 e 1. Senza risposta non c'è un punteggio di riserva. |
| `SOCIAL_API_KEY` | Bearer verso la fonte social. |

Il gioco non legge queste variabili: la sua serie sondaggi è quella incorporata e illustrativa.

## Dati

```bash
npm run data:ingest   # scarica i CSV pubblici e riscrive src/data/generated
npm run data:map      # opzionale, richiede python3: rigenera la mappa SVG
```

L'ingest mette i grezzi in `data/raw/` (gitignorato) e, se il file c'è già, non lo riscarica. Fonti, alla data di scarico 2026-10-23:

- Compilazione Zenodo dei dati Eligendo, DOI [10.5281/zenodo.13864339](https://zenodo.org/records/13864339): percentuali e seggi di Costituente e Camera 1946–2022. I voti assoluti di quel CSV sono corrotti e non sono importati.
- Ministero dell'Interno, DAIT / Eligendo, catalogo open data: Camera 2022, Senato 2022, europee 2024, regionali 12 febbraio 2023 (Lazio e Lombardia), comunali 28 luglio 2024.
- Limiti regionali da openpolis/geojson-italy, semplificati.

### Copertura

| Livello | Presente | Assente |
| --- | --- | --- |
| Nazionali | Bollettino Camera/Costituente 1946–2022. Microdati Camera e Senato 2022 con voti. | Senato storico. Voti assoluti 1946–2018. Circoscrizione Estero (8 deputati, 4 senatori). Collegi uninominali di Senato in Trentino-Alto Adige e Valle d'Aosta. |
| Europee | Somma comunale 2024, 76 seggi nel modello. | 1979–2019. |
| Regionali | Lazio e Lombardia, 12 febbraio 2023, con il dettaglio provinciale del file. | Gli altri cicli dal 1970 e le altre regioni. La legge regionale non è codificata: il simulatore è parametrico. |
| Comunali | Corte Palasio, 28 luglio 2024. | Il resto dei comuni dal 1946. Il file `comunali-20240609` è stato scartato: le righe sono regionali del 12 febbraio 2023. |

Il microdato Camera 2022 dà Fratelli d'Italia intorno al 26,2%, il bollettino 25,98%. I due file restano distinti e non sono stati riallineati.

Per aggiungere uno scrutinio: estendere `scripts/ingest/build-catalog.ts` con l'URL ufficiale, rilanciare `npm run data:ingest` e verificare `npm test`. Non inserire percentuali a mano.

## Deploy su Vercel

Il deploy non fa parte di questo repository: la build è quella di Next.js 15.

1. Importa il repository. Framework preset: **Next.js**.
2. Comandi di default: `npm install`, `npm run build`. Non serve un passo di ingest in build, perché `src/data/generated` è già nel repo.
3. Node 22. Non impostare Edge come runtime.
4. Variabili: copia quelle che vuoi da `.env.example` nell'ambiente Production (e Preview). `NEXT_PUBLIC_APP_URL` va messo all'URL canonico, per esempio `https://tuo-progetto.vercel.app`, prima di una build se vuoi sitemap e Open Graph corretti.
5. Non committare chiavi. Le route `/api/context` e `/api/comuni` sono Node.js. Senza chiavi rispondono comunque: fattori a zero, serie sondaggi marcata come dimostrativa.

`next.config.ts` include i JSON generati nel file tracing di archivio, simulatore, condivisione e API.

## Architettura

```
scripts/ingest/build-catalog.ts     CSV pubblici → schema normalizzato
src/data/generated/                 catalogo, scrutini, baseline, mappa
src/lib/electoral/rosatellum.ts     Hare, soglie, uninominale
src/lib/electoral/otherLaws.ts      europee, regionali parametriche, comunali
src/lib/model/engine.ts             Monte Carlo
src/lib/model/adapters.ts           sondaggi, notizie, social
src/app/(site)/                     archivio, simulatore, metodologia
src/app/gioco/                      partita illustrativa
```

I test del riparto e del catalogo stanno in `src/lib/electoral/rosatellum.test.ts` e `src/lib/data/catalog.test.ts`.
