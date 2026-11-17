"""Writes the published dataset: one JSON file per level plus a flat CSV."""

import csv
import json
from collections import Counter
from dataclasses import asdict
from pathlib import Path

from .model import LEVELS, Entry, Theme

ENTRY_FIELDS = (
    "id", "de", "article", "plural", "plural_form", "pos",
    "ipa", "uz_respell", "uz", "en", "emoji", "subgroup",
)
CSV_FIELDS = ("level", "theme", "theme_de", "theme_uz", *ENTRY_FIELDS)


def _public(entry: Entry) -> dict:
    record = asdict(entry)
    return {name: record[name] for name in ENTRY_FIELDS}


def level_document(level: str, themes: list[Theme], entries: list[Entry]) -> dict:
    by_theme: dict[int, list[Entry]] = {}
    for entry in entries:
        if entry.level == level:
            by_theme.setdefault(entry.theme, []).append(entry)
    return {
        "level": level,
        "themes": [
            {
                "n": theme.n,
                "de": theme.de,
                "uz": theme.uz,
                "en": theme.en,
                "entries": [_public(entry) for entry in by_theme[theme.n]],
            }
            for theme in themes
            if theme.level == level and theme.n in by_theme
        ],
    }


def stats_document(entries: list[Entry]) -> dict:
    return {
        "total": len(entries),
        "by_level": dict(Counter(entry.level for entry in entries)),
        "by_pos": dict(Counter(entry.pos for entry in entries).most_common()),
        "nouns_with_plural_form": sum(1 for e in entries if e.plural_form),
    }


def _write_json(path: Path, document: object) -> None:
    path.write_text(
        json.dumps(document, ensure_ascii=False, indent=1) + "\n", encoding="utf-8"
    )


def _write_csv(path: Path, themes: list[Theme], entries: list[Entry]) -> None:
    titles = {(theme.level, theme.n): theme for theme in themes}
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=CSV_FIELDS)
        writer.writeheader()
        for entry in entries:
            theme = titles[(entry.level, entry.theme)]
            writer.writerow({
                "level": entry.level,
                "theme": entry.theme,
                "theme_de": theme.de,
                "theme_uz": theme.uz,
                **_public(entry),
            })


def export(data_dir: Path, themes: list[Theme], entries: list[Entry]) -> None:
    data_dir.mkdir(parents=True, exist_ok=True)
    for level in LEVELS:
        _write_json(data_dir / f"{level.lower()}.json", level_document(level, themes, entries))
    _write_json(data_dir / "stats.json", stats_document(entries))
    _write_csv(data_dir / "nemischa.csv", themes, entries)
