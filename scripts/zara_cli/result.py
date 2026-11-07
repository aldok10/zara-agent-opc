"""Check results: one vocabulary for every gate."""
from __future__ import annotations

from dataclasses import dataclass, field

from . import console


@dataclass(frozen=True)
class Check:
    name: str
    ok: bool
    detail: str = ""
    fix: str = ""

    def emit(self) -> None:
        if self.ok:
            console.ok(f"{self.name}{': ' + self.detail if self.detail else ''}")
            return
        console.fail(self.name)
        if self.detail:
            print(f"      {self.detail}")
        if self.fix:
            print(f"      FIX: {self.fix}")


@dataclass
class Report:
    title: str
    checks: list[Check] = field(default_factory=list)

    def add(self, *checks: Check) -> "Report":
        self.checks.extend(checks)
        return self

    @property
    def failed(self) -> list[Check]:
        return [c for c in self.checks if not c.ok]

    def emit(self) -> int:
        console.section(self.title)
        for check in self.checks:
            check.emit()
        passed = len(self.checks) - len(self.failed)
        summary = f"{passed}/{len(self.checks)} checks passed"
        if self.failed:
            console.fail(summary)
            return 1
        console.ok(summary)
        return 0
