import pytest

from nemischa.plural import apply_umlaut, plural_from_marker


@pytest.mark.parametrize(
    ("word", "expected"),
    [
        ("Haus", "Häus"),
        ("Vater", "Väter"),
        ("Flughafen", "Flughäfen"),
        ("Bahnhof", "Bahnhöf"),
        ("Apfel", "Äpfel"),
        ("Arzt", "Ärzt"),
        ("Saal", "Säl"),
        ("Irrtum", "Irrtüm"),
        ("Buch", "Büch"),
        ("Kind", "Kind"),
    ],
)
def test_apply_umlaut_changes_the_last_back_vowel(word, expected):
    assert apply_umlaut(word) == expected


@pytest.mark.parametrize(
    ("word", "marker", "expected"),
    [
        ("Vorname", "-n", "Vornamen"),
        ("Tag", "-e", "Tage"),
        ("Lehrer", "-", "Lehrer"),
        ("Haus", "⸚-er", "Häuser"),
        ("Datensatz", "⸚-e", "Datensätze"),
        ("Vater", "⸚-", "Väter"),
        ("Lehrerin", "-nen", "Lehrerinnen"),
        ("Auto", "-s", "Autos"),
        ("Museum", "Museen", "Museen"),
        ("Eltern", "Pl.", "Eltern"),
        ("Kaufmann", "-leute", "Kaufleute"),
        ("Einkaufszentrum", "-zentren", "Einkaufszentren"),
        ("Praktikum", "-a", "Praktika"),
    ],
)
def test_plural_from_marker_builds_the_full_form(word, marker, expected):
    assert plural_from_marker(word, marker) == expected


@pytest.mark.parametrize("marker", ["", "Sg.", "-/-nen", "-s/-e"])
def test_plural_from_marker_returns_none_when_there_is_no_single_form(marker):
    assert plural_from_marker("Balkon", marker) is None


def test_plural_from_marker_skips_headwords_with_optional_parts():
    assert plural_from_marker("(Kredit-)Karte", "-n") is None
