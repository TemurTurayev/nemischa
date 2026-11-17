"""URL-safe identifiers for entries.

Ids are public: they are page addresses, keys of saved learner progress and
Anki note ids. Once an entry has an id it must keep it, so every assignment is
remembered in a registry file (pipeline/ids.json) and never reused.
"""

import re
import unicodedata
from dataclasses import replace

from .model import Entry

_GERMAN = str.maketrans({"ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss"})
_NOT_SLUG = re.compile(r"[^a-z0-9]+")


def slugify(text: str) -> str:
    german = text.lower().translate(_GERMAN)
    ascii_only = unicodedata.normalize("NFKD", german).encode("ascii", "ignore").decode()
    return _NOT_SLUG.sub("-", ascii_only).strip("-")


def entry_key(entry: Entry) -> str:
    """What makes an entry the same word across builds."""
    return f"{entry.de}|{entry.pos}|{entry.article}"


def _candidates(entry: Entry):
    base = slugify(entry.de) or "soz"
    yield base
    yield f"{base}-{entry.pos}"
    if entry.article:
        yield f"{base}-{slugify(entry.article)}"
    number = 2
    while True:
        yield f"{base}-{number}"
        number += 1


def assign_ids(
    entries: list[Entry], registry: dict[str, str] | None = None
) -> tuple[list[Entry], dict[str, str]]:
    """Give every entry its registered id, or a new unused one.

    Returns the entries with ids and the registry extended by the new ones.
    """
    known = dict(registry or {})
    taken = set(known.values())
    result = []
    for entry in entries:
        key = entry_key(entry)
        if key not in known:
            known[key] = next(c for c in _candidates(entry) if c not in taken)
            taken.add(known[key])
        result.append(replace(entry, id=known[key]))
    return result, known
