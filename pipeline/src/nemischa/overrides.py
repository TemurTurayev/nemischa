"""Hand-reviewed corrections applied on top of the raw data.

overrides.json keeps every manual decision in one auditable place:

    {"fixes": [{"match": {"level": "A1", "de": "Stadt"}, "set": {"plural": "⸚-e"}, "why": "..."}],
     "drops": [{"match": {"level": "A1", "de": "BIC"}, "why": "..."}]}
"""

import json
from dataclasses import fields, replace
from pathlib import Path

from .model import Entry

_FIELDS = frozenset(field.name for field in fields(Entry))
_DERIVED = frozenset({"id", "plural_form"})  # computed later; setting them would be ignored
_INTEGER_FIELDS = frozenset({"theme"})


def load_overrides(path: Path) -> dict:
    if not path.exists():
        return {"fixes": [], "drops": []}
    try:
        document = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        raise RuntimeError(f"overrides file {path} is not valid JSON: {error}") from error
    return {"fixes": document.get("fixes", []), "drops": document.get("drops", [])}


def _matches(entry: Entry, match: dict) -> bool:
    return all(getattr(entry, name) == value for name, value in match.items())


def _check_rule(rule: dict, entries: list[Entry]) -> None:
    unknown = (set(rule["match"]) | set(rule.get("set", {}))) - _FIELDS
    if unknown:
        raise ValueError(f"override uses unknown fields {sorted(unknown)}: {rule}")
    derived = set(rule.get("set", {})) & _DERIVED
    if derived:
        raise ValueError(f"override sets computed fields {sorted(derived)}: {rule}")
    for name, value in rule.get("set", {}).items():
        expected = int if name in _INTEGER_FIELDS else str
        if type(value) is not expected:
            raise ValueError(f"override value for {name!r} must be {expected.__name__}: {rule}")
    if not any(_matches(entry, rule["match"]) for entry in entries):
        raise ValueError(f"override matches no entry (stale?): {rule['match']}")


def apply_overrides(entries: list[Entry], overrides: dict) -> list[Entry]:
    """Return corrected entries; a rule that matches nothing is an error."""
    for rule in (*overrides["fixes"], *overrides["drops"]):
        _check_rule(rule, entries)
    result = []
    for entry in entries:
        if any(_matches(entry, rule["match"]) for rule in overrides["drops"]):
            continue
        fixed = entry
        for rule in overrides["fixes"]:
            if _matches(entry, rule["match"]):
                fixed = replace(fixed, **rule["set"])
        result.append(fixed)
    return result
