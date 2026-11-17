from nemischa.model import Entry
from nemischa.reference import RefNoun, to_ref_noun
from nemischa.verify import (
    FROM_REFERENCE,
    MISMATCH,
    NO_PLURAL,
    NOT_A_NOUN,
    UNVERIFIED,
    VERIFIED,
    check_entry,
)


def make(**overrides) -> Entry:
    base = dict(
        de="Haus", article="das", plural="⸚-er", pos="noun", ipa="haʊ̯s",
        uz_respell="HAUS", uz="uy", en="house", emoji="🏠", subgroup="",
        level="A1", theme=1,
    )
    return Entry(**{**base, **overrides})


class FakeReference:
    def __init__(self, nouns: dict[str, RefNoun]):
        self._nouns = nouns

    def lookup(self, lemma: str) -> RefNoun | None:
        return self._nouns.get(lemma)


HAUS = RefNoun(articles=frozenset({"das"}), plurals=("Häuser",))
BALKON = RefNoun(articles=frozenset({"der"}), plurals=("Balkons", "Balkone"))


def test_a_noun_that_matches_the_reference_is_verified():
    check = check_entry(make(), FakeReference({"Haus": HAUS}))
    assert check.article_status == VERIFIED
    assert check.plural_status == VERIFIED
    assert check.entry.plural_form == "Häuser"


def test_a_wrong_article_is_reported_as_a_mismatch():
    check = check_entry(make(article="der"), FakeReference({"Haus": HAUS}))
    assert check.article_status == MISMATCH
    assert check.ref_articles == ("das",)


def test_a_wrong_plural_is_reported_but_kept_for_review():
    check = check_entry(make(plural="-e"), FakeReference({"Haus": HAUS}))
    assert check.plural_status == MISMATCH
    assert check.entry.plural_form == "Hause"
    assert check.ref_plurals == ("Häuser",)


def test_a_marker_with_two_forms_shows_both_reference_plurals():
    entry = make(de="Balkon", article="der", plural="-s/-e")
    check = check_entry(entry, FakeReference({"Balkon": BALKON}))
    assert check.plural_status == FROM_REFERENCE
    assert check.entry.plural_form == "Balkons / Balkone"


def test_a_missing_marker_takes_the_first_reference_plural():
    entry = make(de="Balkon", article="der", plural="")
    check = check_entry(entry, FakeReference({"Balkon": BALKON}))
    assert check.entry.plural_form == "Balkons"


def test_singular_only_nouns_get_no_plural_form():
    check = check_entry(make(de="Grippe", article="die", plural="Sg."), FakeReference({}))
    assert check.plural_status == NO_PLURAL
    assert check.entry.plural_form == ""


def test_a_noun_missing_from_the_reference_stays_unverified():
    check = check_entry(make(de="Datensatz", article="der", plural="⸚-e"), FakeReference({}))
    assert check.article_status == UNVERIFIED
    assert check.plural_status == UNVERIFIED
    assert check.entry.plural_form == "Datensätze"


def test_plural_only_nouns_keep_their_own_form():
    check = check_entry(make(de="Eltern", article="die", plural="Pl."), FakeReference({}))
    assert check.entry.plural_form == "Eltern"
    assert check.plural_status == VERIFIED


def test_other_parts_of_speech_are_passed_through():
    verb = make(de="gehen", article="", plural="", pos="verb")
    check = check_entry(verb, FakeReference({}))
    assert check.article_status == NOT_A_NOUN
    assert check.entry == verb


def test_to_ref_noun_keeps_only_rows_for_the_exact_lemma():
    rows = [
        {"lemma": "Haus", "pos": ["Substantiv"], "genus": "n",
         "flexion": {"nominativ singular": "Haus", "nominativ plural": "Häuser"}},
        {"lemma": "Hau", "pos": ["Substantiv"], "genus": "m",
         "flexion": {"nominativ plural": "Haue"}},
    ]
    assert to_ref_noun("Haus", rows) == HAUS


def test_to_ref_noun_merges_plural_variants_and_genders():
    rows = [
        {"lemma": "Balkon", "pos": ["Substantiv"], "genus": "m",
         "flexion": {"nominativ plural 1": "Balkons", "nominativ plural 2": "Balkone"}},
    ]
    assert to_ref_noun("Balkon", rows) == BALKON
    assert to_ref_noun("Kaufmann", [{"lemma": "Kaufmann", "pos": ["Nachname"]}]) is None
