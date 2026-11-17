"""Pure clean-up functions for a single raw entry."""

import re
from dataclasses import replace

from .model import ARTICLE_CHOICES, UMLAUT_MARK, Entry

_LEADING_ARTICLE = re.compile(r"^(der|die|das)\s+(?=\S)", re.IGNORECASE)
_BARE_UMLAUT_MARKERS = {
    UMLAUT_MARK: f"{UMLAUT_MARK}-",
    f"{UMLAUT_MARK}e": f"{UMLAUT_MARK}-e",
    f"{UMLAUT_MARK}er": f"{UMLAUT_MARK}-er",
    f"{UMLAUT_MARK}en": f"{UMLAUT_MARK}-en",
}
_POS_WITH_ARTICLE = ("noun", "phrase")

OKINA = "\u02bb"  # part of the Uzbek letters oʻ and gʻ
TUTUQ = "\u02bc"  # the Uzbek glottal-stop sign, as in sanʼat
_ANY_MARK = re.compile("(?<=(\\S))['\u2019\u2018`\u02bb\u02bc]")


def fix_uzbek_marks(text: str) -> str:
    """Use ʻ after o/g and ʼ everywhere else, whatever look-alike was typed."""
    return _ANY_MARK.sub(lambda m: OKINA if m.group(1) in "oOgG" else TUTUQ, text)


def clean_ipa(ipa: str) -> str:
    return ipa.strip().strip("[]/").strip()


def clean_plural_marker(marker: str) -> str:
    stripped = marker.strip()
    return _BARE_UMLAUT_MARKERS.get(stripped, stripped)


def split_leading_article(de: str, article: str) -> tuple[str, str]:
    """Move an article written inside the headword into the article field."""
    match = _LEADING_ARTICLE.match(de)
    if match is None:
        return de, article
    return de[match.end():], article or match.group(1).lower()


def clean_article(article: str) -> str:
    lowered = article.strip().lower()
    return lowered if lowered in ARTICLE_CHOICES else ""


def fix_pos(de: str, pos: str) -> str:
    """An adjective + noun group ("soziale Medien") is a phrase, not a noun."""
    if pos == "noun" and " " in de and de[0].islower():
        return "phrase"
    return pos


def normalize_entry(entry: Entry) -> Entry:
    de = entry.de.strip()
    article = clean_article(entry.article)
    if entry.pos == "noun":
        de, article = split_leading_article(de, article)
    pos = fix_pos(de, entry.pos)
    return replace(
        entry,
        de=de,
        article=article if pos in _POS_WITH_ARTICLE else "",
        plural=clean_plural_marker(entry.plural),
        pos=pos,
        ipa=clean_ipa(entry.ipa),
        uz_respell=fix_uzbek_marks(entry.uz_respell.strip()),
        uz=fix_uzbek_marks(entry.uz.strip()),
        en=entry.en.strip(),
        emoji=entry.emoji.strip(),
        subgroup=entry.subgroup.strip(),
    )
