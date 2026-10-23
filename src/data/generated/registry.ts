/* Generato da scripts/ingest/build-catalog.ts. Non modificare a mano. */
import type { ElectionRecord } from "@/lib/data/types";
import catalog from "./catalog.json";
import baseline from "./simulator-baseline.json";
import type { DataCatalog } from "@/lib/data/types";

export const dataCatalog = catalog as DataCatalog;
export const simulatorBaseline = baseline;

export async function loadElection(id: string): Promise<ElectionRecord | null> {
  switch (id) {
    case "costituente-1946":
      return (await import("./costituente-1946.json")).default as ElectionRecord;
    case "politiche-camera-1948-bollettino":
      return (await import("./politiche-camera-1948-bollettino.json")).default as ElectionRecord;
    case "politiche-camera-1953-bollettino":
      return (await import("./politiche-camera-1953-bollettino.json")).default as ElectionRecord;
    case "politiche-camera-1958-bollettino":
      return (await import("./politiche-camera-1958-bollettino.json")).default as ElectionRecord;
    case "politiche-camera-1963-bollettino":
      return (await import("./politiche-camera-1963-bollettino.json")).default as ElectionRecord;
    case "politiche-camera-1968-bollettino":
      return (await import("./politiche-camera-1968-bollettino.json")).default as ElectionRecord;
    case "politiche-camera-1972-bollettino":
      return (await import("./politiche-camera-1972-bollettino.json")).default as ElectionRecord;
    case "politiche-camera-1976-bollettino":
      return (await import("./politiche-camera-1976-bollettino.json")).default as ElectionRecord;
    case "politiche-camera-1979-bollettino":
      return (await import("./politiche-camera-1979-bollettino.json")).default as ElectionRecord;
    case "politiche-camera-1983-bollettino":
      return (await import("./politiche-camera-1983-bollettino.json")).default as ElectionRecord;
    case "politiche-camera-1987-bollettino":
      return (await import("./politiche-camera-1987-bollettino.json")).default as ElectionRecord;
    case "politiche-camera-1992-bollettino":
      return (await import("./politiche-camera-1992-bollettino.json")).default as ElectionRecord;
    case "politiche-camera-1994-bollettino":
      return (await import("./politiche-camera-1994-bollettino.json")).default as ElectionRecord;
    case "politiche-camera-1996-bollettino":
      return (await import("./politiche-camera-1996-bollettino.json")).default as ElectionRecord;
    case "politiche-camera-2001-bollettino":
      return (await import("./politiche-camera-2001-bollettino.json")).default as ElectionRecord;
    case "politiche-camera-2006-bollettino":
      return (await import("./politiche-camera-2006-bollettino.json")).default as ElectionRecord;
    case "politiche-camera-2008-bollettino":
      return (await import("./politiche-camera-2008-bollettino.json")).default as ElectionRecord;
    case "politiche-camera-2013-bollettino":
      return (await import("./politiche-camera-2013-bollettino.json")).default as ElectionRecord;
    case "politiche-camera-2018-bollettino":
      return (await import("./politiche-camera-2018-bollettino.json")).default as ElectionRecord;
    case "politiche-camera-2022":
      return (await import("./politiche-camera-2022.json")).default as ElectionRecord;
    case "politiche-camera-2022-bollettino":
      return (await import("./politiche-camera-2022-bollettino.json")).default as ElectionRecord;
    case "politiche-senato-2022":
      return (await import("./politiche-senato-2022.json")).default as ElectionRecord;
    case "regionali-2023-lazio-lombardia":
      return (await import("./regionali-2023-lazio-lombardia.json")).default as ElectionRecord;
    case "europee-2024":
      return (await import("./europee-2024.json")).default as ElectionRecord;
    case "comunali-2024-07-28":
      return (await import("./comunali-2024-07-28.json")).default as ElectionRecord;
    default: {
      const pack = (await import("./eligendo-historical.json")).default as {
        records: Record<string, ElectionRecord>;
      };
      return pack.records[id] ?? null;
    }
  }
}
