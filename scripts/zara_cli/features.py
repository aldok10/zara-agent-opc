"""Feature list domain model: the only writer of feature state."""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .context import Context
from .result import Check

STATES = ("planned", "active", "passing", "blocked")
PASSING_REQUIRED_KEYS = ("id", "behavior", "verification", "state")


class FeatureError(RuntimeError):
    """Raised when a state transition is not allowed."""


@dataclass
class Layer:
    label: str
    cmd: str
    repair: str = ""


@dataclass
class Feature:
    id: str
    priority: int
    area: str
    title: str
    behavior: str
    state: str
    verification: list[str] = field(default_factory=list)
    layers: list[Layer] = field(default_factory=list)
    evidence: list[str] = field(default_factory=list)
    notes: str = ""

    @classmethod
    def from_dict(cls, raw: dict[str, Any]) -> "Feature":
        layers = [
            Layer(
                label=item.get("label", "layer"),
                cmd=item.get("cmd", ""),
                repair=item.get("repair", ""),
            )
            for item in raw.get("layers", [])
        ]
        return cls(
            id=raw.get("id", ""),
            priority=int(raw.get("priority", 999)),
            area=raw.get("area", ""),
            title=raw.get("title", ""),
            behavior=raw.get("behavior", ""),
            state=raw.get("state", "planned"),
            verification=list(raw.get("verification", [])),
            layers=layers,
            evidence=list(raw.get("evidence", [])),
            notes=raw.get("notes", ""),
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "priority": self.priority,
            "area": self.area,
            "title": self.title,
            "behavior": self.behavior,
            "state": self.state,
            "verification": self.verification,
            "layers": [
                {"label": layer.label, "cmd": layer.cmd, "repair": layer.repair}
                for layer in self.layers
            ],
            "evidence": self.evidence,
            "notes": self.notes,
        }


class FeatureStore:
    """Reads and writes feature_list.json. No command edits the file directly."""

    def __init__(self, ctx: Context, data: dict[str, Any]):
        self.ctx = ctx
        self.data = data

    @classmethod
    def load(cls, ctx: Context) -> "FeatureStore":
        path = ctx.path("feature_list.json")
        if not path.is_file():
            raise FeatureError("feature_list.json is missing")
        return cls(ctx, json.loads(path.read_text(encoding="utf-8")))

    def save(self) -> None:
        self.data["last_updated"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        self.ctx.write_json(self.data, "feature_list.json")

    def all(self) -> list[Feature]:
        return [Feature.from_dict(raw) for raw in self.data.get("features", [])]

    def get(self, feature_id: str) -> Feature:
        for feature in self.all():
            if feature.id == feature_id:
                return feature
        raise FeatureError(f"feature {feature_id} not found")

    def _raw(self, feature_id: str) -> dict[str, Any]:
        for raw in self.data.get("features", []):
            if raw.get("id") == feature_id:
                return raw
        raise FeatureError(f"feature {feature_id} not found")

    def active(self) -> Feature | None:
        for feature in self.all():
            if feature.state == "active":
                return feature
        return None

    def next_planned(self) -> Feature | None:
        planned = [f for f in self.all() if f.state == "planned"]
        return min(planned, key=lambda f: f.priority) if planned else None

    def activate(self, feature_id: str) -> Feature:
        current = self.active()
        if current is not None and current.id != feature_id:
            raise FeatureError(
                f"feature {current.id} is already active; finish it before activating {feature_id}"
            )
        raw = self._raw(feature_id)
        if raw.get("state") == "passing":
            raise FeatureError(f"feature {feature_id} is already passing")
        raw["state"] = "active"
        self.save()
        return self.get(feature_id)

    def mark_passing(self, feature_id: str, labels: list[str]) -> Feature:
        raw = self._raw(feature_id)
        now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        evidence = f"verified {now} at {self.ctx.git_sha} via {', '.join(labels)}"
        raw["state"] = "passing"
        kept = list(raw.get("evidence", []))
        kept.append(evidence)
        raw["evidence"] = kept[-3:]
        self.save()
        return self.get(feature_id)

    def block(self, feature_id: str, note: str) -> Feature:
        raw = self._raw(feature_id)
        raw["state"] = "blocked"
        raw["notes"] = note
        self.save()
        return self.get(feature_id)

    def vcr(self) -> tuple[int, int, float]:
        features = self.all()
        passing = len([f for f in features if f.state == "passing"])
        activated = passing + len([f for f in features if f.state == "active"])
        ratio = 1.0 if activated == 0 else passing / activated
        return passing, activated, ratio

    def check(self) -> list[Check]:
        features = self.all()
        checks: list[Check] = []

        active = [f.id for f in features if f.state == "active"]
        checks.append(
            Check(
                name="single active feature",
                ok=len(active) <= 1,
                detail=f"active: {', '.join(active)}" if active else "none active",
                fix="finish the active feature through the gate before activating another",
            )
        )

        unknown = sorted({f.state for f in features} - set(STATES))
        checks.append(
            Check(
                name="state values valid",
                ok=not unknown,
                detail=f"unknown: {', '.join(unknown)}" if unknown else "",
                fix="use planned | active | passing | blocked",
            )
        )

        missing = sorted(
            raw.get("id", "?")
            for raw in self.data.get("features", [])
            if any(key not in raw for key in PASSING_REQUIRED_KEYS)
        )
        checks.append(
            Check(
                name="required fields present",
                ok=not missing,
                detail=f"missing keys: {', '.join(missing)}" if missing else "",
                fix="every feature needs id, behavior, verification, state",
            )
        )

        no_evidence = sorted(f.id for f in features if f.state == "passing" and not f.evidence)
        checks.append(
            Check(
                name="passing features carry evidence",
                ok=not no_evidence,
                detail=f"without evidence: {', '.join(no_evidence)}" if no_evidence else "",
                fix="run the gate; never set state by hand",
            )
        )

        unblocked = sorted(f.id for f in features if f.state == "blocked" and not f.notes)
        checks.append(
            Check(
                name="blocked features carry a note",
                ok=not unblocked,
                detail=f"without note: {', '.join(unblocked)}" if unblocked else "",
                fix="record what blocks it and what would unblock it",
            )
        )
        return checks
