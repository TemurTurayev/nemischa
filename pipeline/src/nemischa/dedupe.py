"""Removes repeated words so each one lives at its lowest level.

A repeat often carries another meaning ("das Glas": jar, then drinking glass).
Dropping it would lose that meaning, so new meanings are merged into the entry
that is kept, and every merge is reported for review.
"""

import re
from dataclasses import dataclass, replace

from .model import Entry

_OPTIONAL_REFLEXIVE = "(sich) "
_MAX_MEANINGS = 4
_COMMA_OUTSIDE_BRACKETS = re.compile(r",\s*(?![^()]*\))")
_BRACKETS = re.compile(r"\s*\([^)]*\)")


@dataclass(frozen=True)
class Merge:
    kept: Entry  # the entry as it was before the merge
    dropped: Entry
    uz: str  # the merged translation


def _key(entry: Entry) -> tuple[str, str, str]:
    """"(sich) duschen" is the same word as "duschen"; "sich bewerben" is not."""
    headword = entry.de.casefold().removeprefix(_OPTIONAL_REFLEXIVE)
    return headword, entry.pos, entry.article


def _meanings(text: str) -> list[str]:
    return [part.strip() for part in _COMMA_OUTSIDE_BRACKETS.split(text) if part.strip()]


def _core(meaning: str) -> str:
    """What a meaning boils down to: "ism (oti)" → "ism", "yotoq xona" → "yotoqxona"."""
    bare = _BRACKETS.sub("", meaning).strip() or meaning
    return bare.casefold().replace(" ", "").replace("-", "")


def merge_meanings(kept: str, extra: str) -> str:
    """Append the meanings of `extra` that `kept` does not have yet."""
    result = _meanings(kept)
    seen = {_core(meaning) for meaning in result}
    for meaning in _meanings(extra):
        if _core(meaning) not in seen and len(result) < _MAX_MEANINGS:
            result.append(meaning)
            seen.add(_core(meaning))
    return ", ".join(result)


def _merged(kept: Entry, repeat: Entry) -> Entry:
    uz = merge_meanings(kept.uz, repeat.uz)
    if uz == kept.uz:
        return kept
    return replace(kept, uz=uz, en=merge_meanings(kept.en, repeat.en))


def dedupe(entries: list[Entry]) -> tuple[list[Entry], list[Entry], list[Merge]]:
    """Split entries into (kept, dropped, merges); the first occurrence wins.

    Entries must arrive ordered from the lowest level to the highest.
    """
    position: dict[tuple[str, str, str], int] = {}
    kept: list[Entry] = []
    dropped: list[Entry] = []
    merges: list[Merge] = []
    for entry in entries:
        index = position.get(_key(entry))
        if index is None:
            position[_key(entry)] = len(kept)
            kept.append(entry)
            continue
        dropped.append(entry)
        merged = _merged(kept[index], entry)
        if merged is not kept[index]:
            merges.append(Merge(kept=kept[index], dropped=entry, uz=merged.uz))
            kept = [*kept[:index], merged, *kept[index + 1:]]
    return kept, dropped, merges
