"""Hard checks: any problem returned here must stop a release."""

import re
from collections import Counter

from .model import ARTICLE_CHOICES, PARTS_OF_SPEECH, Entry

_REQUIRED = ("id", "de", "pos", "ipa", "uz_respell", "uz", "en")
_LATIN_ONLY = ("de", "uz", "en", "uz_respell")
_TEXT_FIELDS = (
    "de", "article", "plural", "plural_form", "ipa", "uz_respell", "uz", "en", "emoji", "subgroup",
)
_MARKUP = re.compile(r"[<>]")  # the data is rendered into web pages and Anki cards
_CYRILLIC = re.compile("[\u0400-\u04ff]")
# oʻ and gʻ take U+02BB, the glottal stop takes U+02BC; plain quotes are never valid.
_WRONG_UZBEK_MARK = re.compile("['\u2019\u2018`]|[oOgG]\u02bc|(?<![oOgG])\u02bb")


def _entry_problems(entry: Entry) -> list[str]:
    problems = [f"empty {name}" for name in _REQUIRED if not getattr(entry, name)]
    if entry.pos not in PARTS_OF_SPEECH:
        problems.append(f"unknown part of speech {entry.pos!r}")
    if entry.article and entry.article not in ARTICLE_CHOICES:
        problems.append(f"unknown article {entry.article!r}")
    problems.extend(
        f"Cyrillic letters in {name}"
        for name in _LATIN_ONLY
        if _CYRILLIC.search(getattr(entry, name))
    )
    problems.extend(
        f"markup character in {name}"
        for name in _TEXT_FIELDS
        if _MARKUP.search(getattr(entry, name))
    )
    problems.extend(
        f"wrong oʻ/gʻ mark in {name}"
        for name in ("uz", "uz_respell")
        if _WRONG_UZBEK_MARK.search(getattr(entry, name))
    )
    return problems


def validate(entries: list[Entry]) -> list[str]:
    """Return human-readable problems; an empty list means the data is clean."""
    problems = [
        f"{entry.level} {entry.de!r}: {problem}"
        for entry in entries
        for problem in _entry_problems(entry)
    ]
    repeated = [key for key, count in Counter(e.id for e in entries).items() if count > 1]
    problems.extend(f"duplicate id {key!r}" for key in repeated)
    return problems
