from nemischa.dedupe import dedupe, merge_meanings
from nemischa.model import Entry
from nemischa.slug import assign_ids, slugify


def make(**overrides) -> Entry:
    base = dict(
        de="Haus", article="das", plural="⸚-er", pos="noun", ipa="haʊ̯s",
        uz_respell="HAUS", uz="uy", en="house", emoji="🏠", subgroup="",
        level="A1", theme=1,
    )
    return Entry(**{**base, **overrides})


def test_slugify_transliterates_german_letters():
    assert slugify("Straße") == "strasse"
    assert slugify("Übergang") == "uebergang"
    assert slugify("sich äußern zu") == "sich-aeussern-zu"
    assert slugify("(Kredit-)Karte") == "kredit-karte"
    assert slugify("Café") == "cafe"


def test_assign_ids_gives_every_entry_a_unique_id():
    entries = [
        make(de="essen", pos="verb", article="", plural=""),
        make(de="Essen", pos="noun", article="das", plural="-"),
        make(de="See", article="der"),
        make(de="See", article="die"),
    ]
    with_ids, registry = assign_ids(entries)
    ids = [e.id for e in with_ids]
    assert registry["essen|verb|"] == "essen"
    assert ids[0] == "essen"
    assert ids[1] == "essen-noun"
    assert ids[2] == "see"
    assert len(set(ids)) == len(ids)


def test_assign_ids_keeps_registered_ids_when_the_data_changes():
    noun = make(de="Essen", pos="noun", article="das", plural="-")
    verb = make(de="essen", pos="verb", article="", plural="")
    _, registry = assign_ids([verb, noun])
    # The verb disappears from the data: the noun must not take over its id.
    with_ids, updated = assign_ids([noun], registry)
    assert with_ids[0].id == "essen-noun"
    assert updated == registry


def test_assign_ids_never_reuses_a_retired_id():
    registry = {"essen|verb|": "essen"}
    with_ids, _ = assign_ids([make(de="Essen", pos="noun", article="das")], registry)
    assert with_ids[0].id == "essen-noun"


def test_dedupe_keeps_the_first_occurrence_of_a_word():
    first = make(level="A1", uz="uy")
    again = make(level="A2", uz="uy")
    kept, dropped, merges = dedupe([first, again])
    assert kept == [first]
    assert dropped == [again]
    assert merges == []


def test_dedupe_merges_a_new_meaning_into_the_kept_entry():
    jar = make(de="Glas", uz="banka", en="jar", level="A1")
    glass = make(de="Glas", uz="stakan", en="glass", level="A2")
    kept, dropped, merges = dedupe([jar, glass])
    assert [(e.uz, e.en, e.level) for e in kept] == [("banka, stakan", "jar, glass", "A1")]
    assert dropped == [glass]
    assert [(m.kept.uz, m.dropped.uz, m.uz) for m in merges] == [("banka", "stakan", "banka, stakan")]
    assert jar.uz == "banka"  # the input entry is not mutated


def test_merge_meanings_ignores_bracketed_notes_and_repeats():
    assert merge_meanings("ism (oti)", "ism (shaxsiy ismi)") == "ism (oti)"
    assert merge_meanings("keksa", "keksa, qari") == "keksa, qari"
    assert merge_meanings("erkak, er", "erkak") == "erkak, er"
    assert merge_meanings("yotoqxona", "yotoq xona") == "yotoqxona"


def test_merge_meanings_does_not_split_inside_brackets():
    assert merge_meanings("ogʻrimoq (bosh, tish)", "azob chekmoq") == "ogʻrimoq (bosh, tish), azob chekmoq"


def test_merge_meanings_stops_at_four():
    assert merge_meanings("a, b, c", "d, e, f") == "a, b, c, d"


def test_dedupe_treats_different_genders_as_different_words():
    lake = make(de="See", article="der", uz="koʻl")
    sea = make(de="See", article="die", uz="dengiz")
    kept, dropped, _ = dedupe([lake, sea])
    assert kept == [lake, sea]
    assert dropped == []


def test_dedupe_merges_an_optional_reflexive_with_the_plain_verb():
    plain = make(de="duschen", pos="verb", article="", plural="")
    optional = make(de="(sich) duschen", pos="verb", article="", plural="")
    reflexive = make(de="sich bewerben", pos="verb", article="", plural="")
    kept, dropped, _ = dedupe([plain, optional, reflexive])
    assert kept == [plain, reflexive]
    assert dropped == [optional]


def test_dedupe_ignores_case_only_within_the_same_part_of_speech():
    verb = make(de="essen", pos="verb", article="", plural="")
    noun = make(de="Essen", pos="noun", article="das", plural="-")
    kept, _, _ = dedupe([verb, noun])
    assert kept == [verb, noun]
