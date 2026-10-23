#!/usr/bin/env python3
"""Sondaggi pubblicati prima del silenzio elettorale, per il backtest.

Fonte: voci Wikipedia che compilano i sondaggi degli istituti.
Si tengono solo le rilevazioni con fine lavoro sul campo entro 15 giorni
prima del voto (legge 28/2000, art. 8) e non più vecchie di cinque mesi.
Le celle vuote non diventano zeri. I sottocampioni (giovani, regionali,
ipotetici) sono esclusi.
"""

from __future__ import annotations

import json
import re
import urllib.request
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "src" / "data" / "polls" / "backtest.json"
RETRIEVED = "2026-10-23"
UA = "ItaliaElect/1.0 (educational ingest)"

CASES = [
    {
        "id": "camera-2018",
        "election": "2018-03-04",
        "page": "Opinion_polling_for_the_2018_Italian_general_election",
    },
    {
        "id": "camera-2022",
        "election": "2022-09-25",
        "page": "Opinion_polling_for_the_2022_Italian_general_election",
    },
    {
        "id": "europee-2019",
        "election": "2019-05-26",
        "page": "2019_European_Parliament_election_in_Italy",
        "section": "Opinion polling",
    },
    {
        "id": "europee-2024",
        "election": "2024-06-08",
        "page": "2024_European_Parliament_election_in_Italy",
        "section": "Opinion polling",
    },
]

MONTHS = {
    "jan": 1,
    "feb": 2,
    "mar": 3,
    "apr": 4,
    "may": 5,
    "jun": 6,
    "jul": 7,
    "aug": 8,
    "sep": 9,
    "oct": 10,
    "nov": 11,
    "dec": 12,
}

EXACT = {
    "PD": "partito-democratico",
    "M5S": "movimento-5-stelle",
    "FDI": "fratelli-ditalia",
    "LEGA": "lega",
    "LN": "lega",
    "FI": "forza-italia",
    "+E": "piu-europa",
    "+EU": "piu-europa",
    "LEU": "liberi-e-uguali",
    "PAP": "potere-al-popolo",
    "NCI": "noi-con-litalia",
    "IV": "italia-viva",
    "A": "azione",
    "EV": "europa-verde",
    "SI": "sinistra-italiana",
    "AVS": "avss",
    "ART.1": "articolo-uno",
    "ART. 1": "articolo-uno",
    "NM": "noi-moderati",
    "UP": "unione-popolare",
    "ISP": "italexit",
    "IC": "impegno-civico",
    "SVP": "svp",
    "UDC": "udc",
    "CP": "civica-popolare",
    "IEI": "italia-europa-insieme",
    "SC": "sud-chiama-nord",
    "PTD": "partito-democratico",
}

SKIP_HEADER = {
    "OTHERS",
    "OTHER",
    "LEAD",
    "UNDECIDED",
    "TURNOUT",
    "POLLING",
    "SAMPLE",
    "DATE",
    "FIELDWORK",
    "FIRM",
    "POLLING FIRM",
    "SAMPLE SIZE",
    "FIELDWORK DATE",
    "ABSTENTION",
}


def fetch(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as response:
        return json.load(response)


def wikitext(page: str, section: str | None) -> tuple[str, str]:
    if section:
        meta = fetch(
            "https://en.wikipedia.org/w/api.php?action=parse&page="
            + page
            + "&prop=sections&format=json&formatversion=2"
        )
        index = None
        for item in meta.get("parse", {}).get("sections", []):
            if item.get("line", "").strip().lower() == section.lower():
                index = item.get("index")
                break
        if index is None:
            raise SystemExit(f"sezione assente: {page} / {section}")
        data = fetch(
            "https://en.wikipedia.org/w/api.php?action=parse&page="
            + page
            + f"&prop=wikitext&section={index}&format=json&formatversion=2"
        )
    else:
        data = fetch(
            "https://en.wikipedia.org/w/api.php?action=parse&page="
            + page
            + "&prop=wikitext&format=json&formatversion=2"
        )
    return data["parse"]["wikitext"], "https://en.wikipedia.org/wiki/" + page


def strip_templates(text: str) -> str:
    out = []
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


def visible(text: str) -> str:
    text = re.sub(r"style=\"[^\"]*\"", " ", text, flags=re.I)
    text = re.sub(r"(?:colspan|rowspan)=\"?\d+\"?", " ", text, flags=re.I)
    text = re.sub(r"<ref[^>]*>.*?</ref>", " ", text, flags=re.I | re.S)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\[\[(?:[^|\]]*\|)?([^\]]+)\]\]", r"\1", text)
    text = re.sub(r"\[https?://[^\s\]]+\s+([^\]]+)\]", r"\1", text)
    text = text.replace("|", " ")
    text = strip_templates(text)
    text = text.replace("'''", "").replace("''", "")
    return re.sub(r"\s+", " ", text).strip()


def party_id(cell: str) -> str | None:
    label = visible(cell)
    token = label.upper().replace("–", "-").strip()
    if token in SKIP_HEADER or not token:
        return None
    if token in EXACT:
        return EXACT[token]
    compact = re.sub(r"[\s./]+", "", token)
    if compact in {"A-IV", "AZ-IV", "AIV"}:
        return "azione-iv"
    folded = token
    rules = [
        ("BROTHERS OF ITALY", "fratelli-ditalia"),
        ("FRATELLI", "fratelli-ditalia"),
        ("FIVE STAR", "movimento-5-stelle"),
        ("DEMOCRATIC PARTY", "partito-democratico"),
        ("NORTHERN LEAGUE", "lega"),
        ("FORZA ITALIA", "forza-italia"),
        ("MORE EUROPE", "piu-europa"),
        ("+EUROPA", "piu-europa"),
        ("FREE AND EQUAL", "liberi-e-uguali"),
        ("POWER TO THE PEOPLE", "potere-al-popolo"),
        ("NOI CON L", "noi-con-litalia"),
        ("US WITH ITALY", "noi-con-litalia"),
        ("ITALIA VIVA", "italia-viva"),
        ("GREEN EUROPE", "europa-verde"),
        ("ITALIAN LEFT", "sinistra-italiana"),
        ("GREENS AND LEFT", "avss"),
        ("ARTICLE ONE", "articolo-uno"),
        ("US MODERATES", "noi-moderati"),
        ("NOI MODERATI", "noi-moderati"),
        ("PEOPLE'S UNION", "unione-popolare"),
        ("ITALEXIT", "italexit"),
        ("CIVIC COMMITMENT", "impegno-civico"),
        ("IMPEGNO CIVICO", "impegno-civico"),
        ("TERZO POLO", "azione-iv"),
        ("AZIONE", "azione"),
        ("ACTION", "azione"),
        ("LEGA", "lega"),
    ]
    for needle, ident in rules:
        if needle in folded:
            return ident
    return None


def parse_date(cell: str, default_year: int | None = None) -> date | None:
    op = re.search(r"Opdrts\|(\d*)\|(\d+)\|([A-Za-z]+)\|(\d{4})", cell)
    if op:
        month = MONTHS.get(op.group(3)[:3].lower())
        if month:
            return date(int(op.group(4)), month, int(op.group(2)))
    op = re.search(r"Opdrts\|(\d+)\|([A-Za-z]+)\|(\d{4})", cell)
    if op:
        month = MONTHS.get(op.group(2)[:3].lower())
        if month:
            return date(int(op.group(3)), month, int(op.group(1)))
    start = re.search(r"Start date\|(\d{4})\|(\d{1,2})\|(\d{1,2})", cell)
    if start:
        return date(int(start.group(1)), int(start.group(2)), int(start.group(3)))
    text = visible(cell)
    named = re.search(
        r"(\d{1,2})\s*[-–]\s*(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})",
        text,
    )
    if named:
        month = MONTHS.get(named.group(3)[:3].lower())
        if month:
            return date(int(named.group(4)), month, int(named.group(2)))
    named = re.search(r"(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})", text)
    if named:
        month = MONTHS.get(named.group(2)[:3].lower())
        if month:
            return date(int(named.group(3)), month, int(named.group(1)))
    if default_year:
        span = re.search(
            r"(\d{1,2})\s+([A-Za-z]+)\s*[–-]\s*(\d{1,2})\s+([A-Za-z]+)",
            text,
        )
        if span:
            start_month = MONTHS.get(span.group(2)[:3].lower())
            end_month = MONTHS.get(span.group(4)[:3].lower())
            if start_month and end_month:
                year = default_year + (1 if end_month < start_month else 0)
                return date(year, end_month, int(span.group(3)))
        named = re.search(r"(\d{1,2})\s*[–-]\s*(\d{1,2})\s+([A-Za-z]+)", text)
        if named:
            month = MONTHS.get(named.group(3)[:3].lower())
            if month:
                return date(default_year, month, int(named.group(2)))
        named = re.search(r"(\d{1,2})\s+([A-Za-z]+)", text)
        if named:
            month = MONTHS.get(named.group(2)[:3].lower())
            if month:
                return date(default_year, month, int(named.group(1)))
    return None


def parse_pct(cell: str) -> float | None:
    if re.search(r"election", cell, re.I):
        return None
    text = visible(cell).replace(",", ".")
    if text in {"", "-", "–", "—", "N/A", "n/a"}:
        return None
    match = re.search(r"(\d{1,2}(?:\.\d+)?)", text)
    if not match:
        return None
    value = float(match.group(1))
    if value > 80:
        return None
    return value


def parse_sample(cell: str) -> int | None:
    digits = re.sub(r"[^\d]", "", visible(cell))
    if not digits:
        return None
    value = int(digits)
    if value < 50 or value > 100000:
        return None
    return value


def split_markup(line: str, mark: str) -> list[str]:
    """Divide le celle wiki senza spezzare un template che contiene ||."""
    parts: list[str] = []
    buf: list[str] = []
    depth = 0
    i = 0
    while i < len(line):
        if line.startswith("{{", i) or line.startswith("[[", i):
            depth += 1
            buf.append(line[i : i + 2])
            i += 2
            continue
        if (line.startswith("}}", i) or line.startswith("]]", i)) and depth:
            depth -= 1
            buf.append(line[i : i + 2])
            i += 2
            continue
        if depth == 0 and line.startswith(mark, i):
            parts.append("".join(buf))
            buf = []
            i += len(mark)
            continue
        buf.append(line[i])
        i += 1
    parts.append("".join(buf))
    return parts


def raw_cells(chunk: str) -> list[str]:
    cells: list[str] = []
    for raw in chunk.split("\n"):
        line = raw.strip()
        if not line or line.startswith("{|") or line.startswith("|}") or line.startswith("|-"):
            continue
        if line.startswith("!"):
            parts = split_markup(line[1:], "!!")
        elif line.startswith("|"):
            parts = split_markup(line[1:], "||")
        else:
            continue
        cells.extend(part.strip() for part in parts)
    return cells


def leaf_parties(chunks: list[str]) -> list[str | None]:
    """Una etichetta per colonna, anche quando la coalizione ha un colspan sopra i partiti."""
    rows: list[list[str]] = []
    for chunk in chunks:
        cells = raw_cells(chunk)
        if cells:
            rows.append(cells)
    grid: dict[tuple[int, int], str] = {}
    colspan_at: dict[tuple[int, int], int] = {}
    for r, cells in enumerate(rows):
        c = 0
        for cell in cells:
            while (r, c) in grid:
                c += 1
            colspan_match = re.search(r'colspan="(\d+)"', cell, re.I)
            rowspan_match = re.search(r'rowspan="(\d+)"', cell, re.I)
            colspan = int(colspan_match.group(1)) if colspan_match else 1
            rowspan = int(rowspan_match.group(1)) if rowspan_match else 1
            for dr in range(rowspan):
                for dc in range(colspan):
                    grid[(r + dr, c + dc)] = cell
                    colspan_at[(r + dr, c + dc)] = colspan
            c += colspan
    if not grid:
        return []
    max_c = max(c for _, c in grid)
    max_r = max(r for r, _ in grid)
    labels: list[str | None] = []
    for c in range(max_c + 1):
        label: str | None = None
        for r in range(max_r + 1):
            cell = grid.get((r, c))
            if not cell or colspan_at.get((r, c), 1) != 1:
                continue
            ident = party_id(cell)
            if ident:
                label = ident
        labels.append(label)
    return labels


def row_cells(chunk: str) -> list[str]:
    cells: list[str] = []
    for raw in chunk.split("\n"):
        line = raw.strip()
        if not line or line.startswith("{|") or line.startswith("|}") or line.startswith("|-"):
            continue
        if line.startswith("!"):
            parts = split_markup(line[1:], "!!")
        elif line.startswith("|"):
            parts = split_markup(line[1:], "||")
        else:
            continue
        for part in parts:
            match = re.search(r"colspan=\"?(\d+)", part, re.I)
            span = int(match.group(1)) if match else 1
            cleaned = re.sub(r"colspan=\"?\d+\"?", "", part, flags=re.I)
            cleaned = re.sub(r"rowspan=\"?\d+\"?", "", cleaned, flags=re.I)
            cleaned = re.sub(r"style=\"[^\"]*\"", "", cleaned, flags=re.I)
            for _ in range(max(1, span)):
                cells.append(cleaned.strip(" |"))
    return cells


def bad_section(title: str) -> bool:
    text = title.lower()
    needles = [
        "youth",
        "18–",
        "18-",
        "among",
        "regional",
        "hypothetical",
        "seat",
        "approval",
        "leadership",
        "candidate",
        "local",
        "subsample",
        "preferred",
        "prime minister",
        "coalition",
        "scenario",
        "aggregat",
        "subnational",
        "graphical",
    ]
    return any(needle in text for needle in needles)


def national_text(text: str) -> str:
    """Tiene il testo nazionale ed esclude i sottoparagrafi di campioni parziali."""
    out: list[str] = []
    skipping: int | None = None
    for line in text.splitlines(keepends=True):
        match = re.match(r"(==+)([^=].*[^=])==+\s*$", line.strip())
        if match:
            level = len(match.group(1))
            if skipping is not None and level <= skipping:
                skipping = None
            if skipping is None and bad_section(match.group(2)):
                skipping = level
                continue
        if skipping is None:
            out.append(line)
    return "".join(out)


def parse_tables(text: str, cutoff: date, earliest: date) -> list[dict]:
    polls = []
    text = national_text(text)
    pieces = re.split(r"\n(==+[^=\n]+==+)", text)
    blocks: list[tuple[int | None, str]] = [(None, pieces[0])]
    for index in range(1, len(pieces), 2):
        year_match = re.search(r"(19|20)\d{2}", pieces[index])
        year = int(year_match.group(0)) if year_match else blocks[-1][0]
        blocks.append((year, pieces[index + 1] if index + 1 < len(pieces) else ""))
    for default_year, block in blocks:
        for table in re.findall(r"\{\|\s*class=\"wikitable[\s\S]*?\n\|\}", block):
            chunks = re.split(r"\n\|-", table)
            header_chunks: list[str] = []
            data_chunks: list[str] = []
            for chunk in chunks:
                if any(line.strip().startswith("!") for line in chunk.splitlines()):
                    header_chunks.append(chunk)
                else:
                    data_chunks.append(chunk)
            parties = leaf_parties(header_chunks)
            if sum(1 for ident in parties if ident) < 3:
                continue
            for chunk in data_chunks:
                cells = row_cells(chunk)
                if len(cells) < 4 or abs(len(cells) - len(parties)) > 2:
                    continue
                end = None
                for cell in cells[:3]:
                    end = parse_date(cell, default_year)
                    if end:
                        break
                if not end or end > cutoff or end < earliest:
                    continue
                firm = visible(cells[1] if len(cells) > 1 else cells[0])
                if not firm or re.search(r"election|result|scrutin|\}\}", firm, re.I):
                    continue
                if parse_date(firm, default_year):
                    continue
                sample = None
                for cell in cells[:4]:
                    sample = parse_sample(cell)
                    if sample:
                        break
                shares: dict[str, float] = {}
                for index, ident in enumerate(parties):
                    if not ident or index >= len(cells):
                        continue
                    value = parse_pct(cells[index])
                    if value is None:
                        continue
                    shares[ident] = shares.get(ident, 0) + value
                if len(shares) < 4:
                    continue
                total = sum(shares.values())
                if total < 70 or total > 115:
                    continue
                polls.append(
                    {
                        "publishedAt": end.isoformat(),
                        "institute": firm[:80],
                        "sampleSize": sample,
                        "shares": {key: round(value, 2) for key, value in shares.items()},
                    }
                )
    best: dict[tuple[str, str], dict] = {}
    for poll in polls:
        firm = re.sub(r"\s+", " ", poll["institute"]).strip().lower()
        key = (poll["publishedAt"], firm)
        previous = best.get(key)
        if previous is None or len(poll["shares"]) > len(previous["shares"]):
            best[key] = poll
    return list(best.values())


def main() -> None:
    payload = {"retrievedAt": RETRIEVED, "elections": []}
    for case in CASES:
        election = date.fromisoformat(case["election"])
        cutoff = election - timedelta(days=15)
        earliest = cutoff - timedelta(days=150)
        text, url = wikitext(case["page"], case.get("section"))
        polls = parse_tables(text, cutoff, earliest)
        # se la finestra è povera, allunga a un anno, sempre prima del silenzio
        if len(polls) < 8:
            polls = parse_tables(text, cutoff, cutoff - timedelta(days=365))
        polls.sort(key=lambda item: item["publishedAt"])
        print(case["id"], "sondaggi", len(polls), "cutoff", cutoff.isoformat())
        payload["elections"].append(
            {
                "id": case["id"],
                "election": case["election"],
                "cutoff": cutoff.isoformat(),
                "source": url,
                "polls": polls,
            }
        )
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2))
    print("scritto", OUT)


if __name__ == "__main__":
    main()
