"""Looks nouns up in a Wiktionary-derived dictionary (the german-nouns package)."""

from dataclasses import dataclass
from typing import Protocol

_GENUS_TO_ARTICLE = {"m": "der", "f": "die", "n": "das"}


@dataclass(frozen=True)
class RefNoun:
    articles: frozenset[str]
    plurals: tuple[str, ...]


class NounLookup(Protocol):
    def lookup(self, lemma: str) -> RefNoun | None: ...


def _unique(values: list[str]) -> tuple[str, ...]:
    return tuple(dict.fromkeys(values))


def to_ref_noun(lemma: str, rows: list[dict]) -> RefNoun | None:
    """Collapse the dictionary rows for one lemma into genders and plurals."""
    own = [
        row for row in rows
        if row.get("lemma") == lemma and "Substantiv" in row.get("pos", [])
    ]
    articles = frozenset(
        _GENUS_TO_ARTICLE[value]
        for row in own
        for key, value in row.items()
        if key.startswith("genus") and value in _GENUS_TO_ARTICLE
    )
    plurals = _unique([
        value
        for row in own
        for key, value in row.get("flexion", {}).items()
        if key.startswith("nominativ plural") and value
    ])
    if not articles and not plurals:
        return None
    return RefNoun(articles=articles, plurals=plurals)


class WiktionaryNouns:
    """Adapter around german_nouns.lookup.Nouns (loaded once, read-only)."""

    def __init__(self) -> None:
        from german_nouns.lookup import Nouns

        self._nouns = Nouns()

    def lookup(self, lemma: str) -> RefNoun | None:
        try:
            rows = self._nouns[lemma]
        except (KeyError, IndexError):
            return None
        return to_ref_noun(lemma, rows)
