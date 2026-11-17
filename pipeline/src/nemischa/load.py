"""Reads the raw per-level JSON files."""

import json
from pathlib import Path

from .model import LEVELS, Entry, Theme

_TEXT_FIELDS = (
    "de", "article", "plural", "pos", "ipa", "uz_respell", "uz", "en", "emoji", "subgroup",
)


def _entry(raw: dict, level: str, theme: int) -> Entry:
    fields = {name: str(raw.get(name) or "") for name in _TEXT_FIELDS}
    return Entry(**fields, level=level, theme=theme)


def load_level(path: Path, level: str) -> tuple[list[Theme], list[Entry]]:
    try:
        document = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise RuntimeError(f"Cannot read raw level file {path}: {error}") from error
    themes: list[Theme] = []
    entries: list[Entry] = []
    for raw_theme in document["themes"]:
        number = int(raw_theme["n"])
        themes.append(Theme(level=level, n=number, de=raw_theme["de"], en=raw_theme["en"]))
        entries.extend(_entry(raw, level, number) for raw in raw_theme["entries"])
    return themes, entries


def load_all(raw_dir: Path) -> tuple[list[Theme], list[Entry]]:
    """Load every level, ordered from the lowest level to the highest."""
    themes: list[Theme] = []
    entries: list[Entry] = []
    for level in LEVELS:
        level_themes, level_entries = load_level(raw_dir / f"{level}.json", level)
        themes.extend(level_themes)
        entries.extend(level_entries)
    return themes, entries
