"""Harness PPC (Propose–Probe–Compose) implementation for Zara."""

from .evidence import EvidenceCollector
from .test_runner import TaskDefinition, TaskLoader, ProbeResult, PPCRunner
from .test_improvement import (
    LedgerEntry,
    LedgerManager,
    Lesson,
    ImprovementHarness,
)

__all__ = [
    "EvidenceCollector",
    "TaskDefinition",
    "TaskLoader", 
    "ProbeResult",
    "PPCRunner",
    "LedgerEntry",
    "LedgerManager",
    "Lesson",
    "ImprovementHarness",
]


