"use client";

import { useEffect, useMemo, useState } from "react";
import type { PartyResult, ProvinceResult } from "@/types/simulation";
import { REGIONS } from "@/lib/electoral/provinces";
import { PARTIES } from "@/lib/electoral/parties";
import {
  computeRegionalShares,
  regionalSharesToPartyResults,
} from "@/lib/electoral/regional";
import {
  NationalBarChart,
  SwingChart,
} from "@/components/charts/election-charts";
import { ItalyLeafletMap } from "@/components/map/italy-leaflet-map-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export function FilteredElectionCharts({
  nationalResults,
  provincialMap,
  defaultPartySlug,
}: {
  nationalResults: PartyResult[];
  provincialMap: ProvinceResult[];
  defaultPartySlug?: string;
}) {
  const [region, setRegion] = useState<string>("all");
  const [partySlug, setPartySlug] = useState<string>(
    defaultPartySlug ?? nationalResults[0]?.partySlug ?? "all",
  );

  const [pollingBaseline, setPollingBaseline] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch("/api/baseline")
      .then((r) => r.json())
      .then((d) => d.ok && setPollingBaseline(d.baseline))
      .catch(() => undefined);
  }, []);

  const nationalShares = useMemo(
    () => Object.fromEntries(nationalResults.map((r) => [r.partySlug, r.percentage])),
    [nationalResults],
  );

  const filteredProvinces = useMemo(() => {
    if (region === "all") return provincialMap;
    const r = REGIONS.find((x) => x.code === region);
    if (!r) return provincialMap;
    return provincialMap.filter((p) => p.regionName === r.name);
  }, [provincialMap, region]);

  const displayResults = useMemo(() => {
    if (region === "all") {
      if (partySlug === "all") return nationalResults;
      const hit = nationalResults.find((r) => r.partySlug === partySlug);
      if (!hit) return nationalResults;
      return nationalResults.map((r) =>
        r.partySlug === partySlug
          ? { ...r, percentage: r.percentage * 1.02 }
          : r,
      );
    }

    const regionName = REGIONS.find((x) => x.code === region)?.name;
    if (!regionName) return nationalResults;

    const regionalShares = computeRegionalShares(nationalShares, regionName);
    const baseline =
      Object.keys(pollingBaseline).length > 0
        ? pollingBaseline
        : nationalShares;
    let results = regionalSharesToPartyResults(
      regionalShares,
      nationalResults,
      baseline,
    );

    if (partySlug !== "all") {
      results = results.map((r) =>
        r.partySlug === partySlug
          ? { ...r, percentage: r.percentage * 1.02 }
          : r,
      );
    }
    return results;
  }, [nationalResults, nationalShares, pollingBaseline, region, partySlug]);

  const regionLabel =
    region === "all"
      ? "Nazionale"
      : REGIONS.find((x) => x.code === region)?.name ?? region;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5 min-w-[140px]">
          <Label>Regione</Label>
          <Select value={region} onValueChange={setRegion}>
            <SelectTrigger>
              <SelectValue placeholder="Regione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte</SelectItem>
              {REGIONS.map((r) => (
                <SelectItem key={r.code} value={r.code}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 min-w-[140px]">
          <Label>Partito</Label>
          <Select value={partySlug} onValueChange={setPartySlug}>
            <SelectTrigger>
              <SelectValue placeholder="Partito" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti</SelectItem>
              {PARTIES.filter((p) => p.slug !== "italexit").map((p) => (
                <SelectItem key={p.slug} value={p.slug}>
                  {p.shortName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-[var(--muted)] pb-2">
          {regionLabel}
          {region !== "all" && ` · ${filteredProvinces.length} province`}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{regionLabel}</CardTitle>
          </CardHeader>
          <CardContent>
            <NationalBarChart results={displayResults} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Swing</CardTitle>
          </CardHeader>
          <CardContent>
            <SwingChart results={displayResults} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mappa · {regionLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          <ItalyLeafletMap
            data={filteredProvinces}
            highlightSlug={partySlug === "all" ? defaultPartySlug : partySlug}
          />
        </CardContent>
      </Card>
    </div>
  );
}
