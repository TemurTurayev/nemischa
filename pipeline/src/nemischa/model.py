"""Immutable records shared by every pipeline step."""

from dataclasses import dataclass

LEVELS = ("A1", "A2", "B1", "B2", "C1")

PARTS_OF_SPEECH = (
    "noun", "verb", "adjective", "adverb", "preposition",
    "conjunction", "pronoun", "number", "phrase", "other",
)

ARTICLES = ("der", "die", "das")
ARTICLE_CHOICES = (*ARTICLES, "der/die", "der/das", "die/das")

SINGULAR_ONLY = "Sg."
PLURAL_ONLY = "Pl."
UMLAUT_MARK = "⸚"


@dataclass(frozen=True)
class Entry:
    de: str
    article: str
    plural: str  # textbook marker (-e, ⸚-er, Sg., Pl.) or a full irregular form
    pos: str
    ipa: str
    uz_respell: str
    uz: str
    en: str
    emoji: str
    subgroup: str
    level: str
    theme: int
    id: str = ""
    plural_form: str = ""  # full nominative plural; empty when none or unknown


@dataclass(frozen=True)
class Theme:
    level: str
    n: int
    de: str
    en: str
    uz: str = ""
