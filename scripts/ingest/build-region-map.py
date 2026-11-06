#!/usr/bin/env python3
"""Semplifica il GeoJSON delle regioni (openpolis) in path SVG committabili."""

import json
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "src" / "data" / "generated" / "italy-regions.json"
GEO_CANDIDATES = [
    ROOT / "data" / "raw" / "limits_IT_regions.geojson",
    Path("/tmp/italy-regions.geojson"),
]
GEO_URL = "https://raw.githubusercontent.com/openpolis/geojson-italy/master/geojson/limits_IT_regions.geojson"

NAMES = {
    "Piemonte": "Piemonte",
    "Valle d'Aosta/Vallée d'Aoste": "Valle d'Aosta",
    "Liguria": "Liguria",
    "Lombardia": "Lombardia",
    "Trentino-Alto Adige/Südtirol": "Trentino-Alto Adige",
    "Veneto": "Veneto",
    "Friuli-Venezia Giulia": "Friuli-Venezia Giulia",
    "Emilia-Romagna": "Emilia-Romagna",
    "Marche": "Marche",
    "Toscana": "Toscana",
    "Umbria": "Umbria",
    "Lazio": "Lazio",
    "Campania": "Campania",
    "Abruzzo": "Abruzzo",
    "Molise": "Molise",
    "Puglia": "Puglia",
    "Basilicata": "Basilicata",
    "Calabria": "Calabria",
    "Sicilia": "Sicilia",
    "Sardegna": "Sardegna",
}

LON0, LON1 = 6.55, 18.85
LAT0, LAT1 = 35.45, 47.15
WIDTH, HEIGHT = 520, 680


def project(lon: float, lat: float) -> tuple[float, float]:
    x = (lon - LON0) / (LON1 - LON0) * WIDTH
    y = (LAT1 - lat) / (LAT1 - LAT0) * HEIGHT
    return x, y


def rdp(points: list[tuple[float, float]], epsilon: float) -> list[tuple[float, float]]:
    if len(points) < 3:
        return points
    start, end = points[0], points[-1]
    dx, dy = end[0] - start[0], end[1] - start[1]
    norm = (dx * dx + dy * dy) ** 0.5 or 1
    worst = 0.0
    index = 0
    for i in range(1, len(points) - 1):
        px, py = points[i]
        dist = abs(dy * px - dx * py + end[0] * start[1] - end[1] * start[0]) / norm
        if dist > worst:
            worst = dist
            index = i
    if worst > epsilon:
        left = rdp(points[: index + 1], epsilon)
        right = rdp(points[index:], epsilon)
        return left[:-1] + right
    return [start, end]


def ring_area(points: list[tuple[float, float]]) -> float:
    area = 0.0
    for i, (x, y) in enumerate(points):
        nx, ny = points[(i + 1) % len(points)]
        area += x * ny - nx * y
    return abs(area) / 2


def path_for(points: list[tuple[float, float]]) -> str:
    if len(points) < 3:
        return ""
    parts = [f"M{points[0][0]:.1f},{points[0][1]:.1f}"]
    for x, y in points[1:]:
        parts.append(f"L{x:.1f},{y:.1f}")
    parts.append("Z")
    return "".join(parts)


def iter_rings(geometry: dict):
    gtype = geometry["type"]
    coords = geometry["coordinates"]
    if gtype == "Polygon":
        yield coords[0]
    elif gtype == "MultiPolygon":
        for polygon in coords:
            yield polygon[0]


def load_geo() -> dict:
    for path in GEO_CANDIDATES:
        if path.exists():
            return json.loads(path.read_text())
    OUT.parent.mkdir(parents=True, exist_ok=True)
    dest = ROOT / "data" / "raw" / "limits_IT_regions.geojson"
    dest.parent.mkdir(parents=True, exist_ok=True)
    urllib.request.urlretrieve(GEO_URL, dest)
    return json.loads(dest.read_text())


def main() -> None:
    sys.setrecursionlimit(10000)
    geo = load_geo()
    regions = []
    for feature in geo["features"]:
        raw_name = feature["properties"]["reg_name"]
        name = NAMES.get(raw_name)
        if not name:
            print("nome non mappato", raw_name, file=sys.stderr)
            continue
        rings = []
        for ring in iter_rings(feature["geometry"]):
            projected = [project(lon, lat) for lon, lat in ring]
            if len(projected) > 2 and abs(projected[0][0] - projected[-1][0]) < 0.05 and abs(projected[0][1] - projected[-1][1]) < 0.05:
                projected = projected[:-1]
            simplified = rdp(projected, 1.35)
            area = ring_area(simplified)
            if area < 18 or len(simplified) < 4:
                continue
            rings.append((area, simplified))
        rings.sort(key=lambda item: item[0], reverse=True)
        d = "".join(path_for(points) for _, points in rings[:6])
        slug = (
            name.lower()
            .replace("'", "")
            .replace("à", "a")
            .replace(" ", "-")
        )
        regions.append({"id": slug, "name": name, "d": d})
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        json.dumps(
            {
                "viewBox": f"0 0 {WIDTH} {HEIGHT}",
                "source": "openpolis/geojson-italy limits_IT_regions, semplificato",
                "regions": regions,
            },
            ensure_ascii=False,
        )
    )
    print(f"regioni {len(regions)} -> {OUT}")


if __name__ == "__main__":
    main()
