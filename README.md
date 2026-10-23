# Italia Elect

Archivio degli scrutini italiani e simulatore di scenario, con un gioco separato per le partite tra amici. L'interfaccia è in italiano. Il credito è «Sviluppato da Vexa Studio» ([vexastudio.it](https://vexastudio.it)).

Non serve un database. I numeri in `src/data/generated` sono prodotti dallo script di ingest e versionati. Dove una fonte non c'è, il campo resta vuoto: il modello non inventa scrutini.

## Cosa fa

- **Archivio** (`/archivio`): Costituente e Camera 1946–2022, Senato 1948–2018 dagli zip Eligendo, europee 1979–2024, l'ultimo ciclo regionale disponibile per 16 regioni, 93 capoluoghi dal 2009 e i referendum nazionali dal 1946.
- **Simulatore** (`/simulatore`): politiche, regionali e comunali. Lo scenario nazionale di default è la media dei sondaggi pubblicati (Wikipedia, sezione 2026), non il replay del 2022. Europee restano in archivio e nei backtest di riparto, non come consultazione simulabile. Monte Carlo con shock comune, rumore di collegio, scenari e leader.
- **Gioco** (`/gioco/locale`): due giocatori sullo stesso telefono (ballottaggio, regione, coalizioni, duello a turni, draft), con lo stesso motore. `/gioco` tiene le modalità precedenti.
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
| `AI_GATEWAY_API_KEY` | Chiave AI Gateway per leggere un nome o un testo di scenario assenti dagli archivi curati. Senza chiave si usa il fallback locale. |
| `VERCEL_OIDC_TOKEN` | Alternativa alla chiave, sugli ambienti Vercel. |
| `AI_GATEWAY_MODEL` | Modello da usare. Se manca, si prova `GET /v1/models` e, se non risponde, non c'è chiamata. |

Lo scenario nazionale non dipende da queste chiavi: i sondaggi stanno in `src/data/polls/published.json`.

## Dati

```bash
npm run data:ingest   # scarica i CSV pubblici e riscrive src/data/generated
npm run data:map      # opzionale, richiede python3: rigenera la mappa SVG
npm run data:polls    # riscarica la voce Wikipedia e riscrive src/data/polls/published.json
npm run data:backtest # sondaggi pre-silenzio per Camera 2018/2022 e Europee 2019/2024
npm run data:historical # zip Eligendo: Senato, Europee, regionali, capoluoghi, referendum
```

L'ingest mette i grezzi in `data/raw/` (gitignorato) e, se il file c'è già, non lo riscarica. Fonti, alla data di scarico 2026-10-23:

- Compilazione Zenodo dei dati Eligendo, DOI [10.5281/zenodo.13864339](https://zenodo.org/records/13864339): percentuali e seggi di Costituente e Camera 1946–2022. I voti assoluti di quel CSV sono corrotti e non sono importati.
- Ministero dell'Interno, DAIT / Eligendo, catalogo open data: Senato 1948–2018, europee 1979–2019, l'ultimo ciclo regionale trovato per 16 regioni, capoluoghi dal 2009, referendum 1946–presente, più i CSV comunali di Camera, Senato ed europee 2024.
- Limiti regionali da openpolis/geojson-italy, semplificati.

### Copertura

| Livello | Presente | Assente |
| --- | --- | --- |
| Nazionali | Bollettino Camera/Costituente 1946–2022. Senato 1948–2018 dagli zip. Microdati Camera e Senato 2022 con voti. | Voti assoluti Camera 1946–2018. Circoscrizione Estero. Collegi uninominali di Senato in Trentino-Alto Adige e Valle d'Aosta. |
| Europee | Zip 1979–2019 e somma comunale 2024. 76 seggi nel modello. | Il voto fuori sede 2024, pubblicato a parte. |
| Regionali | Ultimo scrutinio negli zip per 16 regioni. Il prior territoriale dei scenari usa lo scostamento del Sì referendario. | Friuli-Venezia Giulia, Sardegna, Trentino-Alto Adige, Valle d'Aosta: non sono in quegli zip. La legge regionale non è codificata. |
| Comunali | 93 capoluoghi con un turno dal 2009, più Corte Palasio il 28 luglio 2024. | Agrigento, Aosta, Bolzano, Caltanissetta, Catania, Enna, Gorizia, Messina, Palermo, Pordenone, Ragusa, Siracusa, Trapani, Trento, Trieste, Udine. Il resto dei comuni. |

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
