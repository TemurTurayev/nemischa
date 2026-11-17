import csv
import json

import pytest

from nemischa.build import build, qa_report
from nemischa.export import export
from nemischa.load import load_all, load_level
from nemischa.model import Entry, Theme
from nemischa.normalize import fix_uzbek_marks
from nemischa.overrides import apply_overrides, load_overrides
from nemischa.reference import RefNoun
from nemischa.validate import validate


def make(**overrides) -> Entry:
    base = dict(
        de="Haus", article="das", plural="⸚-er", pos="noun", ipa="haʊ̯s",
        uz_respell="HAUS", uz="uy", en="house", emoji="🏠", subgroup="",
        level="A1", theme=1,
    )
    return Entry(**{**base, **overrides})


class FakeReference:
    def lookup(self, lemma: str) -> RefNoun | None:
        known = {"Haus": RefNoun(articles=frozenset({"das"}), plurals=("Häuser",))}
        return known.get(lemma)


THEMES = [Theme(level="A1", n=1, de="Wohnen", en="Housing")]
TITLES = {"A1": {"1": {"uz": "Uy-joy"}}}
NO_OVERRIDES = {"fixes": [], "drops": []}


def test_fix_uzbek_marks_picks_the_right_sign_for_each_position():
    assert fix_uzbek_marks("o'g'il") == "oʻgʻil"
    assert fix_uzbek_marks("sun'iy") == "sunʼiy"
    assert fix_uzbek_marks("maʻlumot") == "maʼlumot"
    assert fix_uzbek_marks("toʼplam") == "toʻplam"


def test_build_cleans_dedupes_and_checks_the_entries():
    raw = [make(de=" Haus ", ipa="[haʊ̯s]"), make(level="A2", uz="uy, xonadon")]
    result = build(THEMES, raw, NO_OVERRIDES, TITLES, FakeReference())
    assert [entry.id for entry in result.entries] == ["haus"]
    assert result.entries[0].plural_form == "Häuser"
    assert result.entries[0].ipa == "haʊ̯s"
    assert len(result.dropped) == 1
    assert result.problems == []
    assert result.themes[0].uz == "Uy-joy"


def test_build_reports_a_theme_without_an_uzbek_title():
    result = build(THEMES, [make()], NO_OVERRIDES, {}, FakeReference())
    assert result.problems == ["A1 theme 1 has no Uzbek title"]


def test_qa_report_lists_what_a_human_should_review():
    raw = [make(article="der"), make(de="Europa", article="", plural="Sg.")]
    report = qa_report(build(THEMES, raw, NO_OVERRIDES, TITLES, FakeReference()))
    assert report["entries"] == 2
    assert [row["de"] for row in report["article_mismatches"]] == ["Haus"]
    assert report["nouns_without_article"] == ["Europa"]


def test_validate_accepts_clean_entries():
    assert validate([make(id="haus")]) == []


@pytest.mark.parametrize(
    ("change", "expected"),
    [
        ({"uz": ""}, "empty uz"),
        ({"pos": "nomen"}, "unknown part of speech"),
        ({"uz": "уй"}, "Cyrillic letters in uz"),
        ({"uz": "o'g'il"}, "wrong oʻ/gʻ mark in uz"),
        ({"uz": "maʻlumot"}, "wrong oʻ/gʻ mark in uz"),
        ({"article": "ein"}, "unknown article"),
    ],
)
def test_validate_reports_each_kind_of_problem(change, expected):
    problems = validate([make(id="haus", **change)])
    assert any(expected in problem for problem in problems)


def test_validate_rejects_markup_in_any_text_field():
    problems = validate([make(id="haus", uz="uy</script>")])
    assert any("markup character in uz" in problem for problem in problems)


def test_build_reuses_the_id_registry_and_reports_merged_meanings():
    raw = [make(de="Glas", uz="banka"), make(de="Glas", uz="stakan", level="A2")]
    result = build(THEMES, raw, NO_OVERRIDES, TITLES, FakeReference(), {"Glas|noun|das": "glas-behaelter"})
    assert result.entries[0].id == "glas-behaelter"
    assert result.entries[0].uz == "banka, stakan"
    report = qa_report(result)
    assert report["meanings_merged"] == 1
    assert report["merged_translations"][0]["now"] == "banka, stakan"


def test_validate_reports_duplicate_ids():
    assert "duplicate id 'haus'" in validate([make(id="haus"), make(id="haus", de="Hause")])


def test_overrides_fix_and_drop_matching_entries():
    entries = [make(), make(de="Euro", article="", plural="")]
    overrides = {
        "fixes": [{"match": {"de": "Euro"}, "set": {"article": "der", "plural": "-s"}}],
        "drops": [{"match": {"de": "Haus"}}],
    }
    result = apply_overrides(entries, overrides)
    assert [(e.de, e.article, e.plural) for e in result] == [("Euro", "der", "-s")]
    assert entries[1].article == ""  # originals are left untouched


def test_a_stale_override_is_an_error():
    with pytest.raises(ValueError, match="matches no entry"):
        apply_overrides([make()], {"fixes": [], "drops": [{"match": {"de": "Auto"}}]})


def test_an_override_with_an_unknown_field_is_an_error():
    rule = {"match": {"de": "Haus"}, "set": {"gender": "n"}}
    with pytest.raises(ValueError, match="unknown fields"):
        apply_overrides([make()], {"fixes": [rule], "drops": []})


def test_an_override_cannot_set_computed_fields():
    rule = {"match": {"de": "Haus"}, "set": {"plural_form": "Hauser"}}
    with pytest.raises(ValueError, match="computed fields"):
        apply_overrides([make()], {"fixes": [rule], "drops": []})


def test_an_override_value_must_have_the_right_type():
    rule = {"match": {"de": "Haus"}, "set": {"theme": "3"}}
    with pytest.raises(ValueError, match="must be int"):
        apply_overrides([make()], {"fixes": [rule], "drops": []})


def test_load_overrides_handles_missing_and_broken_files(tmp_path):
    assert load_overrides(tmp_path / "absent.json") == {"fixes": [], "drops": []}
    broken = tmp_path / "overrides.json"
    broken.write_text("{not json", encoding="utf-8")
    with pytest.raises(RuntimeError, match="not valid JSON"):
        load_overrides(broken)


def _write_raw(raw_dir, level, words):
    document = {"level": level, "themes": [{
        "n": 1, "de": "Wohnen", "en": "Housing",
        "entries": [{"de": w, "pos": "noun", "article": "das", "uz": "uy", "en": "x",
                     "ipa": "x", "uz_respell": "X", "plural": "-", "emoji": None} for w in words],
    }]}
    (raw_dir / f"{level}.json").write_text(json.dumps(document), encoding="utf-8")


def test_load_all_reads_every_level_in_order(tmp_path):
    for level in ("A1", "A2", "B1", "B2", "C1"):
        _write_raw(tmp_path, level, [f"Wort{level}"])
    themes, entries = load_all(tmp_path)
    assert [entry.level for entry in entries] == ["A1", "A2", "B1", "B2", "C1"]
    assert entries[0].emoji == ""  # missing values become empty strings
    assert len(themes) == 5


def test_load_level_explains_an_unreadable_file(tmp_path):
    with pytest.raises(RuntimeError, match="Cannot read raw level file"):
        load_level(tmp_path / "A1.json", "A1")


def test_export_writes_level_files_stats_and_csv(tmp_path):
    result = build(THEMES, [make()], NO_OVERRIDES, TITLES, FakeReference())
    export(tmp_path, result.themes, result.entries)
    level = json.loads((tmp_path / "a1.json").read_text(encoding="utf-8"))
    assert level["themes"][0]["uz"] == "Uy-joy"
    assert level["themes"][0]["entries"][0]["plural_form"] == "Häuser"
    assert json.loads((tmp_path / "c1.json").read_text(encoding="utf-8"))["themes"] == []
    assert json.loads((tmp_path / "stats.json").read_text(encoding="utf-8"))["total"] == 1
    with (tmp_path / "nemischa.csv").open(encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle))
    assert rows[0]["de"] == "Haus" and rows[0]["theme_uz"] == "Uy-joy"
