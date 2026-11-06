#!/usr/bin/env python3
"""Scarica le tabelle Wikipedia dei sondaggi per le prossime politiche e scrive JSON.

Fonte secondaria: la voce inglese «Opinion polling for the next Italian general election»,
che compila sondaggi pubblicati dagli istituti. Non stimiamo house effect.
Le celle vuote restano assenti, non diventano zeri.
"""

from __future__ import annotations

import json
import re
import urllib.request
from datetime import date
from pathlib import Path

PAGE = "Opinion_polling_for_the_next_Italian_general_election"
API = (
    "https://en.wikipedia.org/w/api.php?action=parse&page="
    + PAGE
    + "&prop=wikitext&format=json&formatversion=2"
)
SOURCE = "https://en.wikipedia.org/wiki/" + PAGE
OUT = Path(__file__).resolve().parents[2] / "src" / "data" / "polls" / "published.json"
RETRIEVED = "2026-10-23"

MONTHS = {
    "January": 1,
    "February": 2,
    "March": 3,
    "April": 4,
    "May": 5,
    "June": 6,
    "July": 7,
    "August": 8,
    "September": 9,
    "October": 10,
    "November": 11,
    "December": 12,
}

PARTY_IDS = [
    "fratelli-ditalia",
    "partito-democratico",
    "movimento-5-stelle",
    "lega",
    "forza-italia",
    "azione",
    "italia-viva",
    "avss",
    "piu-europa",
    "noi-moderati",
    "sud-chiama-nord",
    "pld",
    "ora",
    "futuro-nazionale",
    "psi",
    "pci",
    "piu-uno",
]


def fetch_wikitext() -> str:
    req = urllib.request.Request(API, headers={"User-Agent": "ItaliaElect/1.0 (educational ingest)"})
    with urllib.request.urlopen(req, timeout=60) as response:
        payload = json.load(response)
    return payload["parse"]["wikitext"]


def strip_templates(text: str) -> str:
    out: list[str] = []
    i = 0
    while i < len(text):
        if text.startswith("{{", i):
            depth = 0
            j = i
            while j < len(text) - 1:
                if text.startswith("{{", j):
                    depth += 1
                    j += 2
                elif text.startswith("}}", j):
                    depth -= 1
                    j += 2
                    if depth == 0:
                        break
                else:
                    j += 1
            i = j
        else:
            out.append(text[i])
            i += 1
    return "".join(out)


def clean_text(text: str) -> str:
    text = strip_templates(text)
    text = re.sub(r"<ref[^>]*>.*?</ref>", " ", text, flags=re.I | re.S)
    text = re.sub(r"<[^>]+>", " ", text)
    text = text.replace("'''", "").replace("''", "").replace("&nbsp;", " ")
    text = re.sub(r"\[\[(?:[^|\]]*\|)?([^\]]+)\]\]", r"\1", text)
    text = re.sub(r"\[(https?://[^\]\s]+)\s+([^\]]+)\]", r"\2", text)
    return re.sub(r"\s+", " ", text).strip(" |")


def first_number(text: str) -> float | None:
    cleaned = clean_text(text)
    if not cleaned or cleaned.lower() in {"–", "-", "—", "n/a", "na"}:
        return None
    if re.search(r"\bw\b|with\b", cleaned, re.I) and not re.match(r"^\d", cleaned):
        return None
    match = re.search(r"\d{1,3}(?:[.,]\d+)?", cleaned)
    if not match:
        return None
    raw = match.group(0).replace(",", ".")
    # Migliaia tipo 1.000 nel campione: qui le percentuali usano il punto decimale.
    if raw.count(".") > 1:
        return None
    value = float(raw)
    if value > 60:
        return None
    return value


def section_2026(wikitext: str) -> str:
    start = wikitext.find("=== 2026 ===")
    end = wikitext.find("=== 2025 ===")
    if start < 0 or end < 0 or end <= start:
        raise SystemExit("Tabella 2026 non trovata nella voce Wikipedia")
    return wikitext[start:end]


def rows_of(section: str) -> list[list[str]]:
    rows: list[list[str]] = []
    current: list[str] = []
    for line in section.splitlines():
        if line.startswith("|-"):
            if current:
                rows.append(current)
            current = []
        elif line.startswith("|"):
            current.append(line)
    if current:
        rows.append(current)
    return rows


def cell_value(line: str) -> str:
    raw = line[1:]
    if "Party shading" in raw or "party color" in raw:
        raw = raw.split("|")[-1]
    return raw


def parse_polls(section: str) -> list[dict]:
    polls = []
    for row in rows_of(section):
        joined = "\n".join(row)
        dated = re.search(r"\{\{Opdrts\|(\d+)\|(\d+)\|([A-Za-z]+)\|(\d{4})\}\}", joined)
        if not dated:
            continue
        day = int(dated.group(2))
        month = MONTHS.get(dated.group(3))
        year = int(dated.group(4))
        if not month:
            continue
        try:
            published = date(year, month, day).isoformat()
        except ValueError:
            continue
        cells = [cell_value(line) for line in row]
        # data, istituto, campione, poi le liste
        if len(cells) < 3 + 8:
            continue
        firm_raw = cells[1]
        firm = clean_text(firm_raw) or "Istituto non letto"
        if len(firm) > 80:
            firm = firm[:80]
        sample_text = clean_text(cells[2]).replace(",", "")
        sample_match = re.search(r"\d{3,5}", sample_text)
        sample = int(sample_match.group(0)) if sample_match else None
        party_cells: list[str] = []
        for cell in cells[3:]:
            lowered = cell.lower()
            if "centre-left" in lowered or "centre-right" in lowered or "ffd0d7" in lowered or "c8ebff" in lowered:
                break
            # La colonna «lead» è colorata col colore del primo partito, non è una quota.
            if "party color|" in lowered and "party shading" not in lowered:
                break
            party_cells.append(cell)
        shares: dict[str, float] = {}
        for index, party_id in enumerate(PARTY_IDS):
            if index >= len(party_cells):
                break
            value = first_number(party_cells[index])
            if value is None or value <= 0 or value > 45:
                continue
            shares[party_id] = value
        total = sum(shares.values())
        # Le righe precedenti all'allargamento della tabella mettono il consenso di FN nella colonna Ora.
        if shares.get("ora", 0) > 2.5:
            continue
        if len(shares) < 5 or "fratelli-ditalia" not in shares or not 85 <= total <= 115:
            continue
        url_match = re.search(r"https?://[^\]\s|]+", firm_raw)
        polls.append(
            {
                "id": f"wiki-{published}-{re.sub(r'[^a-z0-9]+', '-', firm.lower())[:40]}-{len(polls)}",
                "institute": firm,
                "publishedAt": published,
                "sampleSize": sample,
                "reliability": 0.75,
                "shares": shares,
                "quality": "published",
                "sourceUrl": url_match.group(0) if url_match else SOURCE,
            }
        )
    return polls


def coalition_spread(polls: list[dict]) -> float | None:
    right = ["fratelli-ditalia", "lega", "forza-italia", "noi-moderati", "sud-chiama-nord"]
    left = ["partito-democratico", "movimento-5-stelle", "avss", "italia-viva", "piu-europa"]
    recent = [p for p in polls if p["publishedAt"] >= "2026-09-01"]
    gaps = []
    for poll in recent:
        shares = poll["shares"]
        if not all(k in shares for k in ("fratelli-ditalia", "partito-democratico", "lega")):
            continue
        gaps.append(sum(shares.get(k, 0) for k in right) - sum(shares.get(k, 0) for k in left))
    if len(gaps) < 5:
        return None
    mean = sum(gaps) / len(gaps)
    var = sum((g - mean) ** 2 for g in gaps) / (len(gaps) - 1)
    return round(var**0.5, 2)


def main() -> None:
    polls = parse_polls(section_2026(fetch_wikitext()))
    if len(polls) < 5:
        raise SystemExit(f"Troppi pochi sondaggi letti: {len(polls)}")
    payload = {
        "sourceUrl": SOURCE,
        "retrievedAt": RETRIEVED,
        "note": (
            "Compilazione dei sondaggi pubblicati nella voce Wikipedia "
            "Opinion polling for the next Italian general election, sezione 2026. "
            "La data è la fine del fieldwork indicata nella tabella, non una stima. "
            "Le celle vuote non sono state riempite. Nessun house effect è stato imputato. "
            "Le coalizioni CSX/CDX della tabella non sono voti di lista e non entrano nelle quote. "
            "Sono state tenute solo le righe allineate all'intestazione corrente: se la colonna Ora supera il 2,5% "
            "la riga è scartata, perché in quelle righe il consenso di Futuro Nazionale finisce nella colonna sbagliata."
        ),
        "coalitionSpreadSd": coalition_spread(polls),
        "polls": polls,
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
    latest = polls[0]
    print(f"scritti {len(polls)} sondaggi in {OUT}")
    print("più recente", latest["publishedAt"], latest["institute"], latest["shares"])
    print("spread coalizioni", payload["coalitionSpreadSd"])


if __name__ == "__main__":
    main()
