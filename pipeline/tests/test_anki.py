import json
import sqlite3
import zipfile

import pytest

from nemischa.anki import build_all, note_fields
from nemischa.model import LEVELS

ENTRY = {
    "id": "haus", "de": "Haus", "article": "das", "plural": "⸚-er", "plural_form": "Häuser",
    "pos": "noun", "ipa": "haʊ̯s", "uz_respell": "HAUS", "uz": "uy", "en": "house",
    "emoji": "🏠", "subgroup": "",
}


def _write_levels(data_dir, entries_by_level):
    for level in LEVELS:
        entries = entries_by_level.get(level, [])
        themes = [{"n": 1, "de": "Wohnen", "uz": "Uy-joy", "en": "Housing", "entries": entries}]
        document = {"level": level, "themes": themes if entries else []}
        (data_dir / f"{level.lower()}.json").write_text(json.dumps(document), encoding="utf-8")


def _note_count(package_path, tmp_path):
    with zipfile.ZipFile(package_path) as archive:
        archive.extract("collection.anki2", tmp_path)
    with sqlite3.connect(tmp_path / "collection.anki2") as connection:
        return connection.execute("select count(*) from notes").fetchone()[0]


def test_note_fields_colour_the_article_and_spell_out_the_plural():
    fields = note_fields(ENTRY, "Uy-joy")
    assert fields[:4] == ["Haus", "das", "das", "die Häuser"]
    assert fields[-1] == "Uy-joy"


def test_note_fields_handle_mixed_and_missing_articles():
    mixed = note_fields({**ENTRY, "article": "der/die"}, "x")
    verb = note_fields({**ENTRY, "article": "", "plural": "", "plural_form": ""}, "x")
    assert mixed[2] == "mixed"
    assert verb[1:4] == ["", "", ""]


def test_note_fields_describe_special_plurals():
    assert note_fields({**ENTRY, "plural": "Sg.", "plural_form": ""}, "x")[3] == ""
    assert note_fields({**ENTRY, "plural": "Pl.", "plural_form": "Eltern"}, "x")[3] == "faqat koʻplikda"


def test_note_fields_escape_html():
    assert note_fields({**ENTRY, "uz": "a <b> & c"}, "x")[6] == "a &lt;b&gt; &amp; c"


def test_build_all_writes_one_package_per_level(tmp_path):
    data_dir, out_dir = tmp_path / "data", tmp_path / "out"
    data_dir.mkdir()
    _write_levels(data_dir, {"A1": [ENTRY, {**ENTRY, "id": "tag", "de": "Tag", "article": "der"}]})
    counts = build_all(data_dir, out_dir)
    assert counts == {"A1": 2, "A2": 0, "B1": 0, "B2": 0, "C1": 0}
    assert _note_count(out_dir / "nemischa-a1.apkg", tmp_path) == 2
    assert sorted(path.name for path in out_dir.iterdir()) == [
        f"nemischa-{level.lower()}.apkg" for level in LEVELS
    ]


def test_build_all_explains_missing_data(tmp_path):
    with pytest.raises(RuntimeError, match="run nemischa-build first"):
        build_all(tmp_path, tmp_path / "out")
