"""Command line entry point: raw word lists in, published dataset out."""

import json
import sys
from collections import Counter
from dataclasses import dataclass, replace
from pathlib import Path

from .dedupe import Merge, dedupe
from .export import export
from .load import load_all
from .model import Entry, Theme
from .normalize import fix_uzbek_marks, normalize_entry
from .overrides import apply_overrides, load_overrides
from .reference import NounLookup, WiktionaryNouns
from .slug import assign_ids
from .validate import validate
from .verify import MISMATCH, NounCheck, check_entry

PIPELINE_DIR = Path(__file__).resolve().parents[2]
REPO_DIR = PIPELINE_DIR.parent
IDS_FILE = PIPELINE_DIR / "ids.json"  # every id ever published; see slug.py
MAX_PROBLEMS_SHOWN = 40


@dataclass(frozen=True)
class BuildResult:
    themes: list[Theme]
    entries: list[Entry]
    checks: list[NounCheck]
    dropped: list[Entry]
    merges: list[Merge]
    ids: dict[str, str]
    problems: list[str]


def _with_titles(themes: list[Theme], titles: dict) -> list[Theme]:
    """Add the Uzbek title to each theme; themes.json may also rename the German one."""
    result = []
    for theme in themes:
        title = titles.get(theme.level, {}).get(str(theme.n), {})
        result.append(replace(
            theme,
            de=title.get("de", theme.de),
            uz=fix_uzbek_marks(title.get("uz", "")),
        ))
    return result


def build(
    themes: list[Theme],
    raw_entries: list[Entry],
    overrides: dict,
    theme_titles: dict,
    reference: NounLookup,
    id_registry: dict[str, str] | None = None,
) -> BuildResult:
    cleaned = [normalize_entry(entry) for entry in raw_entries]
    corrected = apply_overrides(cleaned, overrides)
    kept, dropped, merges = dedupe(corrected)
    with_ids, ids = assign_ids(kept, id_registry)
    checks = [check_entry(entry, reference) for entry in with_ids]
    entries = [check.entry for check in checks]
    titled = _with_titles(themes, theme_titles)
    missing = [f"{t.level} theme {t.n} has no Uzbek title" for t in titled if not t.uz]
    return BuildResult(
        themes=titled,
        entries=entries,
        checks=checks,
        dropped=dropped,
        merges=merges,
        ids=ids,
        problems=[*validate(entries), *missing],
    )


def _noun_row(check: NounCheck) -> dict:
    return {
        "level": check.entry.level,
        "de": check.entry.de,
        "article": check.entry.article,
        "plural": check.entry.plural,
        "plural_form": check.entry.plural_form,
        "ref_articles": list(check.ref_articles),
        "ref_plurals": list(check.ref_plurals),
    }


def _merge_row(merge: Merge) -> dict:
    return {
        "de": merge.kept.de,
        "level": merge.kept.level,
        "had": merge.kept.uz,
        "repeat_level": merge.dropped.level,
        "repeat_had": merge.dropped.uz,
        "now": merge.uz,
    }


def qa_report(result: BuildResult) -> dict:
    """Everything a human should look at before trusting the data."""
    nouns = [check for check in result.checks if check.entry.pos == "noun"]
    return {
        "entries": len(result.entries),
        "duplicates_removed": len(result.dropped),
        "meanings_merged": len(result.merges),
        "nouns": len(nouns),
        "article_status": dict(Counter(check.article_status for check in nouns)),
        "plural_status": dict(Counter(check.plural_status for check in nouns)),
        "article_mismatches": [_noun_row(c) for c in nouns if c.article_status == MISMATCH],
        "plural_mismatches": [_noun_row(c) for c in nouns if c.plural_status == MISMATCH],
        "nouns_without_article": [c.entry.de for c in nouns if not c.entry.article],
        "merged_translations": [_merge_row(merge) for merge in result.merges],
    }


def _read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}


def _write_json(path: Path, document: dict, **options) -> None:
    path.parent.mkdir(exist_ok=True)
    path.write_text(json.dumps(document, ensure_ascii=False, **options) + "\n", encoding="utf-8")


def _print_summary(report: dict) -> None:
    summary = {key: value for key, value in report.items() if not isinstance(value, list)}
    print(json.dumps(summary, ensure_ascii=False, indent=1))
    print(f"article mismatches: {len(report['article_mismatches'])}")
    print(f"plural mismatches:  {len(report['plural_mismatches'])}")


def main() -> int:
    themes, raw_entries = load_all(PIPELINE_DIR / "raw")
    result = build(
        themes,
        raw_entries,
        load_overrides(PIPELINE_DIR / "overrides.json"),
        _read_json(PIPELINE_DIR / "themes.json"),
        WiktionaryNouns(),
        _read_json(IDS_FILE),
    )
    report = qa_report(result)
    _write_json(PIPELINE_DIR / "reports" / "qa.json", report, indent=1)
    _print_summary(report)
    if result.problems:
        print(f"\n{len(result.problems)} blocking problems:", file=sys.stderr)
        for problem in result.problems[:MAX_PROBLEMS_SHOWN]:
            print(f"  - {problem}", file=sys.stderr)
        return 1
    export(REPO_DIR / "data", result.themes, result.entries)
    _write_json(IDS_FILE, result.ids, indent=0, sort_keys=True)
    print(f"wrote {len(result.entries)} entries to {REPO_DIR / 'data'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
