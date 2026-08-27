import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import type { CandidateInput, CandidateProfile, SimulationOutput } from "@/types/simulation";
import { buildDeterministicAnalysis } from "@/lib/ai/analysis";

export async function generateAIAnalysis(
  input: CandidateInput,
  output: SimulationOutput,
  profile: CandidateProfile
): Promise<string> {
  const fallback = buildDeterministicAnalysis(input, output, profile);

  if (!process.env.OPENAI_API_KEY) {
    return fallback;
  }

  try {
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const { text } = await generateText({
      model: openai("gpt-4o"), // GPT-5.x quando disponibile sull'account; fallback robusto
      temperature: 0.4,
      system: `Sei un analista elettorale italiano. Scrivi in italiano elegante e preciso.
Regole vincolanti:
- Presenta i risultati come SIMULAZIONE STATISTICA, non previsione certa.
- Collega ogni affermazione ai dati forniti (percentuali, swing, province, profilo).
- Distingui fatti verificabili da inferenze.
- Non inventare scandali, citazioni o numeri non presenti nei dati.
- Se dataQuality è low/insufficient, dichiaralo esplicitamente.
- Non diffamare: usa formulazioni caute.`,
      prompt: `Candidato: ${input.firstName} ${input.lastName}
Partito: ${input.partySlug}
Descrizione: ${input.description}
Programma: ${input.program ?? "n/d"}

Profilo (inferenze 0-100): ${JSON.stringify(profile)}

Risultati nazionali: ${JSON.stringify(output.nationalResults)}
Coalizioni: ${JSON.stringify(output.coalitions)}
Win probability: ${output.winProbability}%
CI: ${output.confidenceLow}-${output.confidenceHigh}%
Province vinte (sample): ${JSON.stringify(
        output.provincialMap.filter((p) => p.winnerSlug === input.partySlug).slice(0, 15)
      )}
Meta: ${JSON.stringify(output.modelMeta)}

Scrivi un'analisi strutturata in markdown (sintesi, variabili, geografia, coalizioni, limiti).`,
    });

    return text || fallback;
  } catch {
    return fallback;
  }
}
