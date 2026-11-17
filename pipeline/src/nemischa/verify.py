"""Checks noun gender and plural against the reference dictionary."""

from dataclasses import dataclass, replace

from .model import ARTICLES, PLURAL_ONLY, SINGULAR_ONLY, Entry
from .plural import plural_from_marker
from .reference import NounLookup, RefNoun

VERIFIED = "verified"
FROM_REFERENCE = "from-reference"
UNVERIFIED = "unverified"
MISMATCH = "mismatch"
NO_PLURAL = "no-plural"
NO_ARTICLE = "no-article"
NOT_A_NOUN = "not-a-noun"


@dataclass(frozen=True)
class NounCheck:
    entry: Entry
    article_status: str
    plural_status: str
    ref_articles: tuple[str, ...] = ()
    ref_plurals: tuple[str, ...] = ()


def _article_status(entry: Entry, ref: RefNoun | None) -> str:
    ours = {part for part in entry.article.split("/") if part in ARTICLES}
    if not ours:
        return NO_ARTICLE
    if entry.plural == PLURAL_ONLY:  # die Eltern: "die" is the plural article
        return VERIFIED if ours == {"die"} else MISMATCH
    if ref is None or not ref.articles:
        return UNVERIFIED
    if len(ours) > 1:  # der/die Angestellte: the dictionary lists one gender per lemma
        return VERIFIED if ours & ref.articles else MISMATCH
    return VERIFIED if ours <= ref.articles else MISMATCH


def _resolve_plural(entry: Entry, ref: RefNoun | None) -> tuple[str, str]:
    if entry.plural == SINGULAR_ONLY:
        return "", NO_PLURAL
    derived = plural_from_marker(entry.de, entry.plural)
    known = ref.plurals if ref else ()
    if entry.plural == PLURAL_ONLY:
        return derived or "", VERIFIED if not known or derived in known else UNVERIFIED
    if derived and derived in known:
        return derived, VERIFIED
    if derived is None:
        if not known:
            return "", UNVERIFIED
        both_forms = "/" in entry.plural and len(known) > 1  # -s/-e: Balkons / Balkone
        return (" / ".join(known[:2]) if both_forms else known[0]), FROM_REFERENCE
    return derived, MISMATCH if known else UNVERIFIED


def check_entry(entry: Entry, reference: NounLookup) -> NounCheck:
    """Attach the full plural to an entry and say how well it is confirmed."""
    if entry.pos != "noun":
        return NounCheck(entry=entry, article_status=NOT_A_NOUN, plural_status=NOT_A_NOUN)
    ref = reference.lookup(entry.de)
    plural_form, plural_status = _resolve_plural(entry, ref)
    return NounCheck(
        entry=replace(entry, plural_form=plural_form),
        article_status=_article_status(entry, ref),
        plural_status=plural_status,
        ref_articles=tuple(sorted(ref.articles)) if ref else (),
        ref_plurals=ref.plurals if ref else (),
    )
