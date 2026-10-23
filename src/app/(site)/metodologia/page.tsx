import type { Metadata } from "next";
import Link from "next/link";
import { dataCatalog } from "@/data/generated/registry";

export const metadata: Metadata = {
  title: "Metodologia",
  description:
    "Come Italia Elect assegna i seggi, da dove arrivano gli scrutini e cosa il modello non stima.",
};

export default function MethodologyPage() {
  return (
    <article className="prose-analysis mx-auto max-w-3xl px-4 py-10 text-[15px] leading-relaxed sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--it-blue)]">Trasparenza</p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl text-[var(--foreground)] sm:text-5xl">Metodologia</h1>
      <p className="mt-4 text-[var(--muted)]">
        Italia Elect è un archivio di scrutini pubblici e un simulatore di scenario. Non è un sondaggio e non è un
        pronostico. Quando un cursore è a zero, quella componente non sposta i voti.
      </p>

      <h2>Legge nazionale</h2>
      <p>
        Le politiche usano il Rosatellum nel testo vigente dopo la legge 165/2017, la legge costituzionale 1/2020 e il
        decreto legislativo 177/2020. I numeri di seggio del territorio nazionale, presi dal dossier Camera AC0445b sul
        censimento 2011, sono questi: la Camera domestica ha 392 seggi, di cui 147 uninominali e 245 proporzionali; il
        Senato domestico ha 196 seggi, di cui 74 uninominali e 122 proporzionali. L&apos;Estero, 8 deputati e 4 senatori,
        non è nei CSV Italia e non riceve seggi nel modello. La maggioranza indicata è quindi calcolata sui seggi
        assegnati, non su 201 di 400.
      </p>
      <p>
        Il proporzionale usa il quoziente intero di Hare e i maggiori resti. Una lista entra dal 3%. Una coalizione
        entra dal 10%. Le liste fra l&apos;1% e il 3% di una coalizione che supera la soglia trasferiscono i voti ai
        partner ammessi. Una lista sopra il 3% resta in gara anche se la sua coalizione non passa. Al Senato, una lista
        che nel modello supera il 20% nella regione è trattata come ammessa in quella regione. I pareggi sono
        deterministici: resto, poi voti, poi identificativo.
      </p>
      <p>
        I totali di lista alla Camera sono nazionali. Il modello non ripartisce poi i seggi di lista fra le
        circoscrizioni, perché quel passaggio non cambia il totale nazionale di lista. La Valle d&apos;Aosta è fuori dal
        proporzionale, con il suo seggio uninominale. Al Senato il Trentino-Alto Adige ha 6 uninominali e zero
        proporzionali. Le deroghe per le minoranze linguistiche, oltre al flag del 20%, non sono replicate.
      </p>
      <p>
        L&apos;uninominale è una proiezione, non lo scrutinio del candidato. Si applica uno swing uniforme in punti
        percentuali rispetto alle quote di lista del collegio nel 2022, poi vince la coalizione in testa e il seggio
        viene attribuito alla lista più grande di quella coalizione. È una convenzione di presentazione. I collegi della
        Valle d&apos;Aosta non entrano nella proiezione perché le liste non sono quelle nazionali. Il CSV del Senato 2022
        non contiene Trentino-Alto Adige né Valle d&apos;Aosta, quindi quei 7 uninominali non sono proiettati.
      </p>

      <h2>Europee, regionali, comunali</h2>
      <p>
        Le europee del simulatore sono un proporzionale nazionale con soglia del 4%, Hare e 76 seggi, la quota italiana
        del 2024. Non ci sono coalizioni. La baseline è la somma comunale del CSV Eligendo del 9 giugno 2024. L&apos;affluenza
        pubblicata è quella che esce dal file, circa 49,7%, e non è stata corretta a tavolino.
      </p>
      <p>
        Le regionali usano una soglia e un premio scelti da chi simula. Non è la codifica di ciascuna legge regionale.
        I dati reali coprono Lazio e Lombardia del 12 febbraio 2023. La dimensione del consiglio è un parametro. Il
        premio, se indichi una coalizione, viene ripartito fra le sue liste dopo il proporzionale sul resto dei seggi.
      </p>
      <p>
        Le comunali seguono uno schema del testo unico per i comuni sopra 15.000 abitanti: soglia di lista e, se il
        gruppo in testa non ha già il 60% dei seggi, un premio che lo porta a quella quota. Non va usato per i comuni
        più piccoli. Nell&apos;archivio aperto c&apos;è un solo comune, Corte Palasio, dal CSV del 28 luglio 2024.
      </p>

      <h2>Monte Carlo</h2>
      <p>
        Ogni estrazione aggiunge rumore gaussiano con scarto proporzionale a √(p·(1−p)), calibrato in modo che una
        lista al 25% abbia lo scarto indicato dal cursore, poi rinormalizza a 100. Una lista piccola non riceve lo
        stesso scarto assoluto di una grande: altrimenti il troncamento a zero le regalerebbe voti e sposterebbe la
        media. Il generatore è mulberry32 con Box-Muller, quindi lo stesso seme ripete lo stesso scenario.
        Il seme di partenza è 20220925. L&apos;interfaccia usa 1.500 estrazioni e uno scarto di 1,4 punti. L&apos;intervallo
        mostrato è il percentile 5 e il percentile 95. Con scarto zero la media resta la baseline e i seggi
        proporzionali della Camera tornano a 245.
      </p>

      <h2>Sondaggi, attualità, sentiment</h2>
      <p>
        La media dei sondaggi pesa la recenza con emivita di 21 giorni, la radice del campione e un coefficiente di
        affidabilità. Un house effect entra solo se il record lo dichiara: non viene stimato. La serie nel repository è
        dimostrativa, marcata come tale, e resta spenta finché non spunti la casella o non punti <code>POLLS_JSON_URL</code> a
        un JSON <code>{"{ polls: [...] }"}</code>. Se l&apos;URL risponde con un errore si torna alla serie dimostrativa e la
        nota lo dice.
      </p>
      <p>
        Economia, sicurezza, integrazione europea, caro vita e clima social sono elasticità di scenario. Economia e
        social positivi favoriscono le liste indicate come governo sulle politiche del 2022: Fratelli d&apos;Italia, Lega,
        Forza Italia, Noi Moderati. La sicurezza sposta verso destra sullo schema interno. L&apos;integrazione europea usa
        il segno opposto di quello schema, ed è un proxy grossolano. Il caro vita, se positivo, pesa sugli stessi
        incumbenti. I coefficienti sono 0,8 / −0,25 per l&apos;economia, 0,45 per la sicurezza, 0,35 per l&apos;Europa, 0,5 per
        il caro vita, 0,35 / −0,1 per il social. Non sono stime causali.
      </p>
      <p>
        <code>NEWS_API_URL</code> può restituire <code>{"{ economy, security, europe, costOfLiving }"}</code> fra −2 e 2.
        <code> SOCIAL_API_URL</code> può restituire <code>{"{ score }"}</code> fra −1 e 1. Senza chiavi e senza URL i fattori
        restano a zero: non c&apos;è un punteggio di riserva. L&apos;interfaccia applica una fonte esterna solo se premi il
        pulsante.
      </p>

      <h2>Liste ipotetiche e candidati</h2>
      <p>
        Una lista nuova prende voti dalle liste vicine sull&apos;asse sinistra-destra, fino a un tetto del 40%. Il questionario
        di affinità confronta le risposte con uno schema di posizioni, che non è un programma ufficiale. Un nome dell&apos;archivio
        curato sposta la lista e scrive perché: la coerenza ideologica e la notorietà non sono la stessa cosa del consenso.
        Per una figura storica di un regime totalitario, o per la riorganizzazione del disciolto partito fascista, il modello
        mette un tetto molto basso, sposta voti verso le altre liste e mostra la XII disposizione transitoria e finale e la
        legge 20 giugno 1952, n. 645, quando è quel caso. Non genera simboli. Gli scenari (crisi, scandali, crescita) sono
        elasticità di issue ownership, con un tetto per lista e un tetto se si impilano. I numeri del 2018 e del 2022 citati
        nelle note sono scrutini d&apos;archivio, non l&apos;effetto causale dell&apos;evento. La partita in{" "}
        <Link href="/gioco/locale">/gioco/locale</Link> usa questo motore.
      </p>

      <h2>Dati</h2>
      <p>
        Lo script <code>npm run data:ingest</code> scarica i CSV, li normalizza e riscrive <code>src/data/generated</code>.
        I file grezzi restano in <code>data/raw</code> e non vanno in git. Le percentuali nazionali 1946–2022 della Camera
        e della Costituente arrivano dalla compilazione Zenodo dei dati Eligendo (DOI 10.5281/zenodo.13864339). I voti
        assoluti di quel CSV sono corrotti, letti come orari di Excel, e non sono stati importati. Il blocco 2022 nel
        file non ha un&apos;intestazione di anno: è stato riconosciuto perché segue il 2018 e l&apos;affluenza è 63,91%. I seggi
        1994–2001 di quella compilazione sommano circa 155 e sono etichettati come quota proporzionale del Mattarellum.
        Nel 2018 e nel 2022 i seggi di lista del bollettino sono la quota proporzionale; gli uninominali stanno nei
        blocchi di coalizione.
      </p>
      <p>
        I microdati 2022 di Camera e Senato, le europee 2024, le regionali 2023 e il CSV comunale del 28 luglio 2024
        arrivano dal catalogo open data del Ministero dell&apos;Interno (DAIT / Eligendo). Il dettaglio Camera 2022, dopo
        l&apos;inclusione del Trentino-Alto Adige, ha 20 regioni e 147 collegi e un Fratelli d&apos;Italia intorno al 26,2%,
        alcuni decimi sopra il bollettino al 25,98%: la differenza non è stata scalata. La mappa è una semplificazione
        dei limiti regionali openpolis.
      </p>
      <p>Il catalogo generato il {new Date(dataCatalog.generatedAt).toLocaleDateString("it-IT")} dichiara questi limiti:</p>
      <ul>
        {dataCatalog.gaps.map((gap) => (
          <li key={gap.level}>
            <strong className="capitalize">{gap.level}.</strong> {gap.detail}
          </li>
        ))}
      </ul>
      <p>
        Per allargare la copertura si aggiunge un CSV ufficiale allo script di ingest e si rilancia il comando. Non si
        compilano a mano percentuali mancanti.
      </p>
    </article>
  );
}
