"""Turns a textbook plural marker (-e, ⸚-er, ...) into the full plural form."""

from .model import PLURAL_ONLY, SINGULAR_ONLY, UMLAUT_MARK

_UMLAUTS = {"a": "ä", "o": "ö", "u": "ü", "A": "Ä", "O": "Ö", "U": "Ü"}
_BACK_VOWELS = frozenset(_UMLAUTS)

# Markers that replace a word ending instead of being appended to the word.
_ENDING_SWAPS = {
    "-leute": ("mann", "leute"),
    "-zentren": ("zentrum", "zentren"),
    "-a": ("um", "a"),
}


def apply_umlaut(word: str) -> str:
    """Umlaut the last a/o/u of a word: Haus → Häus, Flughafen → Flughäfen."""
    for index in range(len(word) - 1, -1, -1):
        if word[index] not in _BACK_VOWELS:
            continue
        previous = word[index - 1] if index > 0 else ""
        if word[index] in "uU" and previous in ("a", "A"):  # diphthong au → äu
            return word[: index - 1] + _UMLAUTS[previous] + word[index:]
        if previous and previous.lower() == word[index].lower():  # Saal → Säl
            return word[: index - 1] + _UMLAUTS[previous] + word[index + 1:]
        return word[:index] + _UMLAUTS[word[index]] + word[index + 1:]
    return word


def _is_plain_word(word: str) -> bool:
    return all(ch.isalnum() or ch == "-" for ch in word)


def plural_from_marker(de: str, marker: str) -> str | None:
    """Return the full plural, or None when the marker does not name one form."""
    if marker == PLURAL_ONLY:
        return de
    if marker in ("", SINGULAR_ONLY) or "/" in marker or not _is_plain_word(de):
        return None
    if marker == "-":
        return de
    if marker in _ENDING_SWAPS:
        old, new = _ENDING_SWAPS[marker]
        return de[: -len(old)] + new if de.endswith(old) else None
    if marker.startswith(f"{UMLAUT_MARK}-"):
        return apply_umlaut(de) + marker[2:]
    if marker.startswith("-"):
        return de + marker[1:]
    if marker[0].isupper():
        return marker
    return None
