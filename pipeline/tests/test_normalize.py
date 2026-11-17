from nemischa.model import Entry
from nemischa.normalize import (
    clean_article,
    clean_ipa,
    clean_plural_marker,
    fix_pos,
    normalize_entry,
    split_leading_article,
)


def make(**overrides) -> Entry:
    base = dict(
        de="Haus", article="das", plural="⸚-er", pos="noun", ipa="haʊ̯s",
        uz_respell="HAUS", uz="uy", en="house", emoji="🏠", subgroup="",
        level="A1", theme=1,
    )
    return Entry(**{**base, **overrides})


def test_clean_ipa_strips_brackets_and_slashes():
    assert clean_ipa("[ˈfʁɔɪ̯ntʃaft]") == "ˈfʁɔɪ̯ntʃaft"
    assert clean_ipa("/haʊ̯s/") == "haʊ̯s"
    assert clean_ipa(" haʊ̯s ") == "haʊ̯s"


def test_clean_plural_marker_unifies_umlaut_notation():
    assert clean_plural_marker("⸚er") == "⸚-er"
    assert clean_plural_marker("⸚e") == "⸚-e"
    assert clean_plural_marker("⸚") == "⸚-"
    assert clean_plural_marker("-en") == "-en"
    assert clean_plural_marker(" Sg. ") == "Sg."


def test_split_leading_article_moves_article_out_of_headword():
    assert split_leading_article("der Zusammenhang", "") == ("Zusammenhang", "der")
    assert split_leading_article("das Internet", "das") == ("Internet", "das")
    assert split_leading_article("Haus", "das") == ("Haus", "das")


def test_clean_article_rejects_non_articles():
    assert clean_article("der/die/das") == ""
    assert clean_article("Die") == "die"
    assert clean_article("der/die") == "der/die"
    assert clean_article("ein") == ""


def test_fix_pos_turns_adjective_noun_groups_into_phrases():
    assert fix_pos("soziale Medien", "noun") == "phrase"
    assert fix_pos("Erste Hilfe", "noun") == "noun"
    assert fix_pos("(Kredit-)Karte", "noun") == "noun"
    assert fix_pos("gehen", "verb") == "verb"


def test_normalize_entry_returns_a_new_cleaned_entry():
    raw = make(de=" der Bezug ", article="", plural="⸚e", ipa="[bəˈt͡suːk]")
    cleaned = normalize_entry(raw)
    assert cleaned.de == "Bezug"
    assert cleaned.article == "der"
    assert cleaned.plural == "⸚-e"
    assert cleaned.ipa == "bəˈt͡suːk"
    assert raw.de == " der Bezug "  # the input is not mutated


def test_normalize_entry_drops_articles_from_words_that_take_none():
    cleaned = normalize_entry(make(de="erste", article="der/die/das", pos="number", plural=""))
    assert cleaned.article == ""


def test_normalize_entry_keeps_phrase_articles():
    cleaned = normalize_entry(make(de="Erste Hilfe", article="die", pos="phrase", plural="Sg."))
    assert cleaned.article == "die"
