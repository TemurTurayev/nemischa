"""Builds one Anki deck per level from the published dataset in data/."""

import html
import json
import sys
from pathlib import Path

import genanki

from .model import ARTICLES, LEVELS, PLURAL_ONLY, SINGULAR_ONLY
from .slug import slugify

REPO_DIR = Path(__file__).resolve().parents[3]

# Fixed ids keep the decks stable, so a re-import updates cards instead of duplicating them.
MODEL_ID = 1_763_370_001
DECK_IDS = {
    "A1": 1_763_370_101,
    "A2": 1_763_370_102,
    "B1": 1_763_370_103,
    "B2": 1_763_370_104,
    "C1": 1_763_370_105,
}

FIELDS = (
    "German", "Article", "ArticleClass", "Plural", "IPA",
    "Pronunciation", "Uzbek", "English", "Emoji", "Theme",
)

_WORD = (
    '<div class="emoji">{{Emoji}}</div>'
    '<div class="de">{{#Article}}<span class="art {{ArticleClass}}">{{Article}}</span> {{/Article}}'
    "{{German}}</div>"
)
_EXTRA = (
    '<div class="extra">{{#Plural}}koʻplik: {{Plural}} · {{/Plural}}{{Pronunciation}} · [{{IPA}}]</div>'
    '<div class="extra">{{English}}</div>'
    '<div class="theme">{{Theme}}</div>'
)
_MEANING = '<div class="uz">{{Uzbek}}</div>'

TEMPLATES = (
    {
        "name": "Nemischa → oʻzbekcha",
        "qfmt": _WORD,
        "afmt": "{{FrontSide}}<hr id=answer>" + _MEANING + _EXTRA,
    },
    {
        "name": "Oʻzbekcha → nemischa",
        "qfmt": '<div class="emoji">{{Emoji}}</div>' + _MEANING,
        "afmt": '<div class="emoji">{{Emoji}}</div>' + _MEANING + "<hr id=answer>" + _WORD + _EXTRA,
    },
)

CSS = """
.card { font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; text-align: center;
  font-size: 20px; color: #16130c; background: #fbfaf6; }
.emoji { font-size: 44px; }
.de { font-size: 34px; font-weight: 800; margin: 8px 0; }
.uz { font-size: 28px; font-weight: 700; margin: 8px 0; }
.extra { color: #6b6558; font-size: 17px; margin-top: 6px; }
.theme { color: #a59d8b; font-size: 13px; margin-top: 14px; }
.art { padding: 0 8px; border-radius: 8px; font-size: 0.7em; }
.art.der { color: #1d4ed8; background: #e0eaff; }
.art.die { color: #c81e1e; background: #fde4e4; }
.art.das { color: #15803d; background: #dcf5e4; }
.art.mixed { color: #6d28d9; background: #ede7fe; }
.nightMode.card { color: #f4f0e6; background: #14120d; }
"""


def note_model() -> genanki.Model:
    return genanki.Model(
        MODEL_ID,
        "Nemischa",
        fields=[{"name": name} for name in FIELDS],
        templates=list(TEMPLATES),
        css=CSS,
    )


def _plural_text(entry: dict) -> str:
    if entry["plural"] == SINGULAR_ONLY:
        return ""
    if entry["plural"] == PLURAL_ONLY:
        return "faqat koʻplikda"
    return f"die {entry['plural_form']}" if entry["plural_form"] else entry["plural"]


def note_fields(entry: dict, theme_title: str) -> list[str]:
    article = entry["article"]
    values = {
        "German": entry["de"],
        "Article": article,
        "ArticleClass": article if article in ARTICLES else ("mixed" if article else ""),
        "Plural": _plural_text(entry),
        "IPA": entry["ipa"],
        "Pronunciation": entry["uz_respell"],
        "Uzbek": entry["uz"],
        "English": entry["en"],
        "Emoji": entry["emoji"],
        "Theme": theme_title,
    }
    return [html.escape(values[name]) for name in FIELDS]


def build_deck(level_document: dict, model: genanki.Model) -> genanki.Deck:
    level = level_document["level"]
    deck = genanki.Deck(DECK_IDS[level], f"Nemischa::{level}")
    for theme in level_document["themes"]:
        for entry in theme["entries"]:
            deck.add_note(genanki.Note(
                model=model,
                fields=note_fields(entry, theme["uz"]),
                guid=genanki.guid_for("nemischa", entry["id"]),
                tags=[level, slugify(theme["de"])],
            ))
    return deck


def build_all(data_dir: Path, out_dir: Path) -> dict[str, int]:
    """Write nemischa-<level>.apkg for every level; return notes per level."""
    out_dir.mkdir(parents=True, exist_ok=True)
    model = note_model()
    counts = {}
    for level in LEVELS:
        source = data_dir / f"{level.lower()}.json"
        try:
            document = json.loads(source.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as error:
            raise RuntimeError(f"Cannot read {source}; run nemischa-build first: {error}") from error
        deck = build_deck(document, model)
        genanki.Package(deck).write_to_file(out_dir / f"nemischa-{level.lower()}.apkg")
        counts[level] = len(deck.notes)
    return counts


def main() -> int:
    counts = build_all(REPO_DIR / "data", REPO_DIR / "site" / "public" / "anki")
    for level, count in counts.items():
        print(f"{level}: {count} notes")
    return 0


if __name__ == "__main__":
    sys.exit(main())
