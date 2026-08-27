/**
 * Programmi elettorali di esempio / preset caricabili nel form.
 */

export interface SampleProgram {
  id: string;
  title: string;
  subtitle: string;
  suggestedParties: string[];
  ideologyHint: number; // -1 … +1
  descriptionTemplate: string;
  program: string;
}

export const ITALIA_DEL_DOMANI: SampleProgram = {
  id: "italia-del-domani",
  title: "L’Italia del Domani",
  subtitle: "Crescita, innovazione, Europa, scuola, sanità digitale",
  suggestedParties: ["azione-iv", "piu-europa", "partito-democratico", "forza-italia"],
  ideologyHint: 0.05,
  descriptionTemplate:
    "Candidato con profilo riformista e europeista, orientato a innovazione, crescita produttiva, scuola e sanità digitale, sicurezza cibernetica e transizione ecologica intelligente (incluse rinnovabili e ricerca sul nucleare di nuova generazione).",
  program: `PROGRAMMA ELETTORALE — “L’ITALIA DEL DOMANI”

1. Un nuovo patto per la crescita
Obiettivo: tornare a essere uno dei Paesi più innovativi d’Europa.
- Piano nazionale per innovazione e produttività.
- Investimenti in intelligenza artificiale, robotica e ricerca.
- Sostegno alle startup e alle PMI innovative.
- Incentivi alle aziende che assumono giovani qualificati.
- Riduzione della burocrazia per imprese e cittadini.
- Creazione di un ecosistema italiano dell’innovazione.
Messaggio: “L’Italia non deve inseguire il futuro. Deve costruirlo.”

2. Giovani protagonisti del Paese
La prima generazione che non dovrà scegliere tra talento e futuro.
- Prima casa più accessibile per giovani lavoratori.
- Incentivi alle aziende che assumono under 30.
- Rafforzamento degli ITS e dell’università.
- Più borse di studio per studenti meritevoli.
- Piano nazionale contro la fuga dei cervelli.
- Rientro dei giovani italiani dall’estero.

3. Una scuola che prepara alla realtà
- Informatica e intelligenza artificiale nei programmi scolastici.
- Inglese avanzato come competenza fondamentale.
- Più collegamento tra scuola e imprese.
- Valorizzazione degli insegnanti.
- Aggiornamento continuo delle competenze.
Obiettivo: un ragazzo italiano deve avere le stesse opportunità di uno europeo.

4. Sanità pubblica moderna
Difendere il Servizio Sanitario Nazionale con strumenti nuovi.
- Riduzione drastica delle liste d’attesa.
- Fascicolo sanitario digitale funzionante.
- Telemedicina nazionale.
- Assunzione e valorizzazione del personale sanitario.
- Investimenti in ricerca medica.

5. Stato semplice, digitale, vicino ai cittadini
- Pubblica amministrazione completamente digitale.
- Intelligenza artificiale per ridurre tempi e sprechi.
- Una sola identità digitale nazionale.
- Meno moduli, meno burocrazia.
- Servizi pubblici accessibili da smartphone.

6. Sicurezza nel XXI secolo
La sicurezza è anche digitale.
- Potenziamento della cybersecurity nazionale.
- Protezione di ospedali, energia e infrastrutture strategiche.
- Contrasto alla criminalità organizzata con tecnologia e intelligence.
- Cooperazione europea contro terrorismo e minacce informatiche.

7. Un’Italia protagonista in Europa
- Più Italia nelle decisioni europee.
- Difesa comune europea.
- Cooperazione su energia, tecnologia e sicurezza.
- Alleanze forti con Francia, Germania e Spagna.
- Ruolo centrale nelle Nazioni Unite.

8. Economia più equa
Crescita e giustizia sociale insieme.
- Riduzione del peso fiscale sul lavoro.
- Contrasto all’evasione attraverso strumenti digitali.
- Premi alle aziende che creano occupazione stabile.
- Salari più alti attraverso maggiore produttività.
- Sostegno alle famiglie.

9. Transizione ecologica intelligente
- Energie rinnovabili.
- Ricerca sul nucleare di nuova generazione.
- Industria sostenibile.
- Riqualificazione energetica degli edifici.
- Mobilità più efficiente.

10. Una nuova Italia nel mondo
- Diplomazia tecnologica.
- Cooperazione internazionale.
- Rafforzamento di ONU, UE e NATO.
- Maggiore presenza italiana nelle organizzazioni globali.`,
};

export const SAMPLE_PROGRAMS: SampleProgram[] = [ITALIA_DEL_DOMANI];
