import type { DigitalAgent } from "./types";
import { VIRTUAL_POPULATION } from "./constants";

export interface ScaledPopulation {
  agents: DigitalAgent[];
  sampleSize: number;
  virtualPopulation: number;
  scalingFactor: number;
  methodology: string;
}

/**
 * Scala un campione stratificato alla popolazione elettorale virtuale (60M).
 * Ogni agente campione porta un virtualWeight = 60M / sampleSize.
 */
export class AgentScaler {
  static scale(sample: DigitalAgent[]): ScaledPopulation {
    const sampleSize = sample.length;
    const scalingFactor =
      sampleSize > 0 ? sample[0]?.virtualWeight ?? VIRTUAL_POPULATION / sampleSize : 0;

    return {
      agents: sample,
      sampleSize,
      virtualPopulation: sampleSize * scalingFactor,
      scalingFactor,
      methodology:
        `Campione stratificato ${sampleSize.toLocaleString("it-IT")} agenti × ` +
        `peso ${scalingFactor.toLocaleString("it-IT")} = ${VIRTUAL_POPULATION.toLocaleString("it-IT")} elettori virtuali`,
    };
  }
}
