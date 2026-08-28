export interface WhatIfInterpretation {
  hypothesis: string;
  summary: string;
  voteAdjustments: Record<string, number>;
  narrative: string;
  confidence: number;
}

const RULES: Array<{
  patterns: RegExp[];
  adjustments: Record<string, number>;
  summary: string;
  narrative: string;
}> = [
  {
    patterns: [/berlusconi/i, /forza italia/i, /fi torna/i],
    adjustments: {
      "forza-italia": 4.5,
      "fratelli-ditalia": -1.5,
      lega: -0.8,
      "partito-democratico": -1.0,
    },
    summary: "Ritorno di Berlusconi / Forza Italia",
    narrative:
      "Un ritorno di Berlusconi riattiverebbe l'elettorato moderato del centrodestra, penalizzando FdI e spostando voti verso Forza Italia.",
  },
  {
    patterns: [/m5s.*pd|pd.*m5s|allea.*pd/i, /coalizione.*sinistra/i],
    adjustments: {
      "partito-democratico": 3.5,
      "movimento-5-stelle": -2.0,
      "fratelli-ditalia": 1.2,
    },
    summary: "Alleanza M5S–PD",
    narrative:
      "Un'alleanza M5S–PD compatta il centrosinistra ma rischia cannibalizzazione M5S→PD e rally del centrodestra.",
  },
  {
    patterns: [/salvini.*presidente|salvini.*premier|salvini.*consiglio/i],
    adjustments: {
      lega: 5.0,
      "fratelli-ditalia": -2.5,
      "futuro-nazionale": -1.0,
    },
    summary: "Salvini Presidente del Consiglio",
    narrative:
      "Salvini al governo riaccenderebbe la Lega ma creerebbe tensioni nella coalizione con Meloni.",
  },
  {
    patterns: [/esce.*ue|italexit|lascia.*europa|euroscettic/i],
    adjustments: {
      lega: 2.5,
      "futuro-nazionale": 3.0,
      italexit: 2.0,
      "partito-democratico": -2.0,
      "fratelli-ditalia": -1.0,
    },
    summary: "Italia fuori dall'UE",
    narrative:
      "Una narrativa Italexit spinge sovranismo e destre alternative, erodendo PD e moderati.",
  },
  {
    patterns: [/meloni.*dimess|governo.*cad|crisi.*governo/i],
    adjustments: {
      "fratelli-ditalia": -4.0,
      "partito-democratico": 2.5,
      "movimento-5-stelle": 1.5,
      lega: 1.0,
    },
    summary: "Crisi di governo",
    narrative:
      "Una crisi di governo penalizza la forza di maggioranza e premia opposizione e populismo.",
  },
  {
    patterns: [/conte.*premier|conte.*governo/i],
    adjustments: {
      "movimento-5-stelle": 4.0,
      "partito-democratico": 1.0,
      "fratelli-ditalia": -2.0,
    },
    summary: "Conte torna al governo",
    narrative:
      "Conte al governo riattiverebbe il bacino M5S con spillover moderato sul PD.",
  },
  {
    patterns: [/schlein|pd.*segret/i],
    adjustments: {
      "partito-democratico": 2.5,
      avss: 0.8,
      "fratelli-ditalia": -0.5,
    },
    summary: "Rinnovamento PD",
    narrative:
      "Una leadership PD rinnovata recupera centrosinistra e progressisti urbani.",
  },
  {
    patterns: [/futuro nazionale|calenda/i],
    adjustments: {
      "futuro-nazionale": 3.5,
      "azione-iv": -1.0,
      "forza-italia": -0.8,
    },
    summary: "Ascesa Futuro Nazionale",
    narrative:
      "Futuro Nazionale cannibalizza centro moderato e parte del centrodestra soft.",
  },
];

export function interpretWhatIf(hypothesis: string): WhatIfInterpretation {
  const text = hypothesis.trim();
  if (text.length < 8) {
    return {
      hypothesis: text,
      summary: "Ipotesi troppo breve",
      voteAdjustments: {},
      narrative: "Inserisci un'ipotesi più dettagliata per un'analisi significativa.",
      confidence: 0.2,
    };
  }

  for (const rule of RULES) {
    if (rule.patterns.some((p) => p.test(text))) {
      return {
        hypothesis: text,
        summary: rule.summary,
        voteAdjustments: rule.adjustments,
        narrative: rule.narrative,
        confidence: 0.82,
      };
    }
  }

  // Fallback: keyword sentiment
  const neg = /crisi|scandalo|guerra|blackout|corruzione/i.test(text);
  const pos = /vittoria|boom|rinnovamento|alleanza/i.test(text);
  const adjustments: Record<string, number> = {};
  if (neg) {
    adjustments["fratelli-ditalia"] = -1.5;
    adjustments["movimento-5-stelle"] = 1.2;
    adjustments["partito-democratico"] = 0.8;
  } else if (pos) {
    adjustments["fratelli-ditalia"] = 1.0;
    adjustments["partito-democratico"] = 0.5;
  }

  return {
    hypothesis: text,
    summary: "Scenario generico interpretato",
    voteAdjustments: adjustments,
    narrative:
      neg
        ? "L'ipotesi suggerisce uno shock negativo che penalizza il governo e premia opposizione e populismo."
        : pos
          ? "L'ipotesi suggerisce un contesto favoreabile alle forze di maggioranza o al consolidamento istituzionale."
          : "Ipotesi ambigua: impatto moderato distribuito tra i principali partiti.",
    confidence: adjustments ? 0.45 : 0.35,
  };
}
