"""The harness audit, ported from the vendored course shell script.

Same items, same levels, same summary. Five items that used to look for a
shell file now probe the `zara-cli` command instead, because the shell files
are gone: the audit asks for behaviour, not for a filename.
"""
from __future__ import annotations

import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

from ..context import Context
from ..process import ProcessError, run

CRITICAL = "critical"
RECOMMENDED = "recommended"

CLI = Path("scripts", "zara-cli.py")

LOCKFILES = (
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "mix.lock",
    "Pipfile.lock", "poetry.lock", "requirements.txt", "Cargo.lock",
    "go.sum", "Gemfile.lock", "uv.lock", "scripts/uv.lock",
)
RUNTIME_PINS = (
    ".tool-versions", ".nvmrc", ".node-version", ".python-version",
    ".ruby-version", ".java-version", "scripts/.python-version",
)
TASK_RUNNERS = ("Makefile", "package.json", "mix.exs", "justfile", "Taskfile.yml")
FEATURE_LISTS = ("feature_list.json", "features.json", "features.md", "FEATURES.md")
TOOL_SCOPE = (".claude/settings.json", ".claude/settings.local.json", "mcp.json", ".mcp.json")
DOC_NAMES = ("ARCHITECTURE.md", "CONSTRAINTS.md")


@dataclass
class Item:
    level: str
    description: str
    ok: bool
    fix: str = ""


@dataclass
class Audit:
    items: list[Item] = field(default_factory=list)

    def critical(self, description: str, ok: bool, fix: str = "") -> None:
        self.items.append(Item(CRITICAL, description, ok, fix))

    def recommended(self, description: str, ok: bool, fix: str = "") -> None:
        self.items.append(Item(RECOMMENDED, description, ok, fix))

    def counts(self) -> dict[str, tuple[int, int]]:
        result = {CRITICAL: (0, 0), RECOMMENDED: (0, 0)}
        for item in self.items:
            passed, total = result[item.level]
            result[item.level] = (passed + (1 if item.ok else 0), total + 1)
        return result


class Probe:
    """Read-only queries over the repo. No printing, no state."""

    def __init__(self, ctx: Context):
        self.ctx = ctx

    def file(self, *parts: str) -> bool:
        return self.ctx.path(*parts).is_file()

    def directory(self, *parts: str) -> bool:
        return self.ctx.path(*parts).is_dir()

    def any_path(self, *patterns: str) -> bool:
        for pattern in patterns:
            for _ in self.ctx.root.glob(pattern):
                return True
        return False

    def text(self, *parts: str) -> str:
        path = self.ctx.path(*parts)
        try:
            return path.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            return ""

    def matches(self, rel: str, pattern: str) -> bool:
        return re.search(pattern, self.text(*rel.split("/")), re.IGNORECASE | re.MULTILINE) is not None

    def make_target(self, name: str) -> bool:
        return re.search(rf"^{re.escape(name)}\s*:", self.text("Makefile"), re.MULTILINE) is not None

    def instructions(self) -> str:
        return "AGENTS.md" if self.file("AGENTS.md") else "CLAUDE.md"

    def feature_list(self) -> str:
        for name in FEATURE_LISTS[:2]:
            if self.file(name):
                return name
        return ""

    def module_doc(self) -> bool:
        root = self.ctx.root
        for name in DOC_NAMES:
            for path in root.rglob(name):
                if ".git" in path.parts or path.parent == root:
                    continue
                return True
        return False

    def cli_command(self, command: str) -> bool:
        """Prove the command exists by asking the CLI for its help."""
        launcher = self.ctx.path(*CLI.parts)
        if not launcher.is_file():
            return False
        try:
            proc = run(sys.executable, [str(launcher), command, "--help"], cwd=self.ctx.root, timeout=60)
        except (ProcessError, OSError):
            return False
        return proc.returncode == 0


def _feature_counts(probe: Probe) -> tuple[int, int] | None:
    name = probe.feature_list()
    if not name:
        return None
    raw = probe.text(name)
    active = len(re.findall(r'"state":\s*"active"', raw))
    passing = len(re.findall(r'"state":\s*"passing"', raw))
    return active, passing


def run_audit(ctx: Context) -> Audit:
    p = Probe(ctx)
    a = Audit()

    # -- Subsystem 1: Instructions -------------------------------------------
    inst = p.file("AGENTS.md") or p.file("CLAUDE.md")
    a.critical(
        "AGENTS.md or CLAUDE.md exists at repo root",
        inst,
        "Create AGENTS.md at the repo root. It must answer 'what is this system?' "
        "in the first 10 lines and list the verification command.",
    )

    if inst:
        ipath = p.instructions()
        head = "\n".join(p.text(ipath).splitlines()[:10])
        a.critical(
            "Instructions file answers 'what is this system?' in first 10 lines",
            re.search(r"(project|system|service|app|what|overview|this (is|repo|tool))", head, re.IGNORECASE) is not None,
            f"Add a one-line description of the system in the first 10 lines of {ipath}.",
        )
        verification = r"(make check|npm test|mix test|pytest|cargo test|make test|yarn test|verification|verify)"
        a.critical(
            "Verification commands are listed in instructions file",
            p.matches(ipath, verification),
            f"Add a Verification section to {ipath} listing the command to run.",
        )
        a.recommended(
            "Hard constraints (MUST / MUST NOT) are stated",
            p.matches(ipath, r"(MUST|MUST NOT|must not|must never|constraint|forbidden|never)"),
            f"Add a Constraints section to {ipath} with explicit MUST / MUST NOT rules.",
        )
        a.recommended(
            "State files are enumerated (PROGRESS.md, feature_list)",
            p.matches(ipath, r"(PROGRESS\.md|feature_list|DECISIONS\.md|\.harness/decisions)"),
            f"Reference PROGRESS.md, DECISIONS.md, and feature_list.json in {ipath}.",
        )
        a.recommended(
            "Documentation staleness rule present (update docs with code, no stale docs)",
            p.matches(ipath, r"(stale|staleness|same commit|doc.*update|update.*doc|outdated)"),
            f"Add a rule to {ipath}: 'Update docs in the same commit as the code change.'",
        )
        a.recommended(
            "Commit atomicity rule present (one logical op per commit)",
            p.matches(ipath, r"(atomic|one commit|same commit|partial commit|consistent.*commit|commit.*consistent)"),
            f"Add a rule to {ipath}: 'One logical operation per commit.'",
        )

        lines = len(p.text(ipath).splitlines())
        a.recommended(
            "Entry file is 50-200 lines (router, not encyclopedia) [L04]",
            50 <= lines <= 200,
            f"{ipath} is {lines} lines (target 50-200) - split detail into docs/ or add the missing router sections.",
        )
        a.recommended(
            "Entry file links to topic documents in docs/ [L04]",
            p.matches(ipath, r"(docs/[a-z])"),
            f"Add links in {ipath} to topic docs in docs/.",
        )
        a.recommended(
            "Hard constraints section has source/why annotations per rule [L04]",
            p.matches(ipath, r"(source:|remove when:|why:|added because)"),
            f"Annotate each constraint in {ipath} with a 'source:' or 'why:' comment.",
        )
    else:
        a.critical("Cannot check instructions content - file missing", False,
                   "Create AGENTS.md at the repo root covering system description, verification command, constraints, and state files.")
        a.critical("Cannot check verification commands - file missing", False,
                   "Add a Verification section to AGENTS.md.")
        a.recommended("Cannot check hard constraints - file missing", False,
                      "Add a Constraints section to AGENTS.md.")
        a.recommended("Cannot check state file references - file missing", False,
                      "Reference PROGRESS.md, DECISIONS.md, and feature_list.json in AGENTS.md.")

    a.recommended(
        "Module-level doc (ARCHITECTURE.md or CONSTRAINTS.md) co-located with code",
        p.module_doc(),
        "Create ARCHITECTURE.md or CONSTRAINTS.md inside a code directory describing that module's design.",
    )

    # -- Subsystem 2: Tools ---------------------------------------------------
    a.recommended(
        "Tool access is scoped (settings.json, .claude/, or MCP config present)",
        p.any_path(*TOOL_SCOPE),
        "Commit an MCP config (.mcp.json) or a scoped tool settings file.",
    )
    a.recommended(
        "MCP or tool integrations documented in instructions file",
        p.matches(p.instructions(), r"(MCP|tool|permission|capability)"),
        "Add a Tools/MCP section to your instructions file listing available integrations.",
    )

    # -- Subsystem 3: Environment --------------------------------------------
    a.critical(
        "Dependency lockfile present",
        p.any_path(*LOCKFILES),
        "Commit a dependency lockfile so installs are reproducible.",
    )
    a.recommended(
        "Runtime version pinned (.tool-versions, .nvmrc, .python-version, etc.)",
        p.any_path(*RUNTIME_PINS),
        "Pin the exact runtime version in .python-version or .tool-versions.",
    )
    a.recommended(
        "Makefile (or equivalent task runner) present",
        p.any_path(*TASK_RUNNERS),
        "Create a Makefile with at least setup, check, and test targets.",
    )
    a.recommended(
        "Single-command setup target exists (make setup / npm install)",
        p.make_target("setup"),
        "Add a 'setup:' target to your Makefile that installs all dependencies from scratch.",
    )
    a.recommended(
        "Single-command dev server target exists (make dev)",
        p.make_target("dev"),
        "Add a 'dev:' target to your Makefile that starts the local dev server.",
    )

    # -- Subsystem 4: State ---------------------------------------------------
    a.critical(
        "PROGRESS.md exists at repo root",
        p.file("PROGRESS.md"),
        "Create PROGRESS.md with Current State, In Progress, Next Steps, and Blockers.",
    )
    if p.file("PROGRESS.md"):
        a.recommended(
            "PROGRESS.md references current task / in-progress work",
            p.matches("PROGRESS.md", r"(in.progress|current|task|next step|blocker|completed)"),
            "Add an '## In Progress' section to PROGRESS.md describing the current task.",
        )
    a.recommended(
        "DECISIONS.md or .harness/decisions/ exists",
        p.any_path("DECISIONS.md", ".harness/decisions"),
        "Create DECISIONS.md at the repo root to log architectural decisions.",
    )
    a.recommended(
        "feature_list.json (or equivalent) exists",
        p.any_path(*FEATURE_LISTS),
        "Create feature_list.json with id, behavior, verification, state per entry.",
    )
    if p.feature_list():
        name = p.feature_list()
        a.recommended(
            "feature_list.json contains required fields (id, behavior, verification, state)",
            all(re.search(rf'"{key}"', p.text(name)) for key in ("id", "behavior", "verification", "state")),
            f"Every entry in {name} needs id, behavior, verification, and state.",
        )

    # -- Subsystem 5: Feedback ------------------------------------------------
    a.recommended(
        "Makefile has a 'check' target (runs full verification pipeline)",
        p.make_target("check"),
        "Add a 'check:' target that runs the full pipeline. It is the single command agents use.",
    )
    a.recommended(
        "Makefile has a 'test' target",
        p.make_target("test"),
        "Add a 'test:' target to Makefile.",
    )
    a.critical(
        "Verification command documented in AGENTS.md or CLAUDE.md",
        p.matches(p.instructions(), r"(make check|npm test|mix test|pytest|cargo test|make test|yarn test|verify|verification)"),
        "Add a Verification section with the exact command to run before every commit.",
    )

    # -- L05: Cross-Session Continuity ---------------------------------------
    ipath = p.instructions()
    a.critical(
        "PROGRESS.md has a Current State block (commit hash + test status)",
        p.matches("PROGRESS.md", r"(last commit|current state|commit.*hash|test.*pass|passing.*fail)"),
        "Add a '## Current State' section to PROGRESS.md and update it on every clock-out.",
    )
    a.recommended(
        "Clock-in routine documented in instructions (read PROGRESS.md then run check)",
        p.matches(ipath, r"(clock.in|session start|before touching)"),
        "Add a Clock-in section: read PROGRESS.md, then run the gate to confirm a green baseline.",
    )
    a.recommended(
        "Clock-out routine documented in instructions (update PROGRESS.md then commit)",
        p.matches(ipath, r"(clock.out|session end|before closing)"),
        "Add a Clock-out section: update PROGRESS.md, run the gate, commit.",
    )
    a.recommended(
        "Context anxiety / rushed-finish warning present in instructions",
        p.matches(ipath, r"(context.*anxi|rushed|running low|skip verif|do not rush)"),
        "Add: 'If running low on context, do NOT rush - stop, update PROGRESS.md, and commit a checkpoint.'",
    )
    a.recommended(
        "Commit message guidance (explain why, not just what) present",
        p.matches(ipath, r"(commit.*why|why.*commit|explain why|not just what)"),
        "Add: 'Write commit messages that explain WHY the change was made.'",
    )
    a.recommended(
        "PROGRESS.md Next Steps section exists with specific actions",
        p.matches("PROGRESS.md", r"(next step|next action)"),
        "Add a '## Next Steps' section with specific, actionable items.",
    )

    # -- L03: Repository as System of Record ----------------------------------
    a.recommended(
        "ACID - Durability: cross-session knowledge written to tracked files (PROGRESS + DECISIONS present)",
        p.file("PROGRESS.md") and (p.file("DECISIONS.md") or p.directory("docs", "decisions")),
        "Both PROGRESS.md and DECISIONS.md (or .harness/decisions/) must exist.",
        "Both PROGRESS.md and DECISIONS.md must exist, or .harness/decisions/ directory.",
    )
    a.recommended(
        "ACID - Consistency: verifiable consistent-state predicate documented (make check / equivalent)",
        p.matches(ipath, r"(make check|consistent state|exits 0|all tests pass|verification pipeline)"),
        "Document the consistent-state predicate, e.g. 'the repo is consistent when the gate exits 0'.",
    )
    a.recommended(
        "ACID - Atomicity: commit atomicity rule stated in instructions",
        p.matches(ipath, r"(atomic|one commit|same commit|partial commit|consistent.*commit|commit.*consistent)"),
        "State commit atomicity: each commit is one complete logical change.",
    )
    a.recommended(
        "Knowledge proximity: at least one module-level doc exists alongside code (not only root-level docs)",
        p.module_doc(),
        "Create ARCHITECTURE.md or CONSTRAINTS.md inside a code directory.",
    )

    # -- L07: WIP=1 and VCR Enforcement --------------------------------------
    a.recommended(
        "WIP=1 rule present in instructions (one active feature at a time) [L07]",
        p.matches(ipath, r"(WIP.?1|one.*active|active.*at.*time|single.*active|only.*one.*active|activate.*new.*feature|new.*feature.*while.*active)"),
        "Add a WIP=1 rule: only one feature may be active at a time.",
    )
    a.recommended(
        "make vcr target exists in Makefile [L07]",
        p.make_target("vcr"),
        "Add a 'vcr:' target that prints passing / activated features.",
    )

    counts = _feature_counts(p)
    if counts is not None:
        active, passing = counts
        activated = active + passing
        if activated == 0:
            a.recommended("VCR: no activated features yet (OK to activate first feature) [L07]", True)
        elif active > 0:
            a.recommended(
                f"VCR = {passing}/{activated} - {active} active feature(s) not yet passing (VCR < 1.0) [L07]",
                False,
                "Finish the active feature through the gate before activating another.",
            )
        else:
            a.recommended(
                f"VCR = {passing}/{activated} = 1.0 - all activated features are passing [L07]",
                True,
            )

    # -- L08: Feature List as Harness Primitive -------------------------------
    fl = p.feature_list()
    a.recommended(
        "feature_list.json entries have an 'evidence' field [L08]",
        bool(fl) and '"evidence"' in p.text(fl),
        "Add an 'evidence' field to every entry; the gate fills it.",
    )
    a.recommended(
        "verify-feature command present (zara-cli verify) [L08]",
        p.cli_command("verify"),
        "zara-cli must expose `verify <id>|--all`; the gate writes the state.",
    )
    a.recommended(
        "make verify-feature target exists in Makefile [L08]",
        p.make_target("verify-feature"),
        "Add a 'verify-feature:' target calling `python scripts/zara-cli.py verify $(F)`.",
    )
    a.recommended(
        "Feature List Rules documented in instructions (pass-state gating) [L08]",
        p.matches(ipath, r"(verify.feature|verification script|don.t.*state|state.*automatically|harness.*updat|pass.state|never.*set.*state.*passing|never.*edit.*state)"),
        "Add a Feature List Rules section: 'Never set state to passing directly - run the gate.'",
    )
    a.recommended(
        "Feature granularity rule documented (one session per feature) [L08]",
        p.matches(ipath, r"(one session|completable.*session|session.*complet|one feature.*session|single session)"),
        "Add: 'Each feature must be completable in one session.'",
    )
    a.recommended(
        "State machine documented (not_started -> active -> passing) [L08]",
        p.matches(ipath, r"(not_started|state machine|no skipping|active.*passing)"),
        "Document the state machine: planned -> active -> passing.",
    )

    # -- L09: Preventing Premature Completion Declarations --------------------
    a.recommended(
        "Definition of Done section present in instructions [L09]",
        p.matches(ipath, r"(definition of done|feature complete|runtime evidence|code is written|all layers pass)"),
        "Add a Definition of Done: complete when runtime evidence passes, not when code is written.",
    )
    a.recommended(
        "Three-layer verification model documented [L09]",
        p.matches(ipath, r"(layer 1|layer 2|layer 3|syntax.*static|runtime.*behav|system.*confirm|end.to.end.*verif)"),
        "Document the three layers: static, runtime behaviour, system confirmation.",
    )
    a.recommended(
        "Layer ordering rule documented (do not skip layers) [L09]",
        p.matches(ipath, r"(do not proceed|don.t proceed|layer.*fail|skip.*layer|must pass in order|in order)"),
        "Add: 'Do not proceed to Layer N+1 if Layer N fails.'",
    )
    a.recommended(
        "Runtime signals documented (app startup, side effects) [L09]",
        p.matches(ipath, r"(ready state|app.*start|startup|side effect|database write|file operation|cleanup|debug artifact)"),
        "Document runtime signals: ready state, side effects, no debug artifacts.",
    )
    if fl:
        a.recommended(
            "feature_list.json uses layers with repair instructions [L09]",
            '"layers"' in p.text(fl) and '"repair"' in p.text(fl),
            "Add a layers array with label, cmd, repair per entry.",
        )
    gate_source = p.text("scripts", "zara_cli", "commands", "verify.py")
    a.recommended(
        "The gate handles multi-layer validation with repair output [L09]",
        all(token in gate_source for token in ("repair", "How to fix")),
        "Keep the layer runner printing WHAT / WHY / FIX and a 'How to fix:' line on failure.",
    )

    # -- L10: E2E Testing and Architectural Boundaries ------------------------
    a.recommended(
        "make e2e target exists in Makefile [L10]",
        p.make_target("e2e"),
        "Add an 'e2e:' target running the end-to-end suite.",
    )
    a.recommended(
        "make check-arch target exists in Makefile [L10]",
        p.make_target("check-arch"),
        "Add a 'check-arch:' target running the architecture rules.",
    )
    a.recommended(
        "Architecture rule runner present (zara-cli arch) [L10]",
        p.cli_command("arch"),
        "zara-cli must expose `arch`; it reads .harness/arch-rules.json and prints WHAT/WHY/FIX.",
    )
    a.recommended(
        ".harness/arch-rules.json present (architectural rule registry) [L10]",
        p.file(".harness", "arch-rules.json"),
        "Create .harness/arch-rules.json with at least one rule.",
    )
    a.recommended(
        "Arch rules use WHAT/WHY/FIX error format [L10]",
        all(f'"{key}"' in p.text(".harness", "arch-rules.json") for key in ("what", "why", "fix")),
        "Every rule needs what, why, and fix with agent-actionable text.",
    )
    a.recommended(
        "Architecture Boundaries section present in instructions [L10]",
        p.matches(ipath, r"(architecture.*boundar|arch.*boundar|layer.*depend|enforce.*invariant|check-arch|arch.rules)"),
        "Add an Architecture Boundaries section and state that the arch rule runner enforces it.",
    )
    a.recommended(
        "E2E requirement for cross-component changes documented [L10]",
        p.matches(ipath, r"(cross.component|cross.domain|layer 3.*required|e2e.*required|end.to.end.*required|required.*cross)"),
        "Add: 'Layer 3 (e2e) is required when changes cross component or domain boundaries.'",
    )
    a.recommended(
        "Review-to-automation promotion principle documented [L10]",
        p.matches(ipath, r"(code review.*automat|review.*promot|promot.*check|new.*error.*rule|catch.*review.*rule|arch.rules)"),
        "Add: 'Every new error category caught in code review becomes a rule in .harness/arch-rules.json.'",
    )

    # -- L11: Observability Inside the Harness --------------------------------
    a.recommended(
        "templates/sprint-contract.md present [L11]",
        p.file("templates", "sprint-contract.md"),
        "Create templates/sprint-contract.md: scope, DoD, exclusions.",
    )
    a.recommended(
        "templates/evaluator-rubric.md present [L11]",
        p.file("templates", "evaluator-rubric.md"),
        "Create templates/evaluator-rubric.md with A/B/C/D thresholds per dimension.",
    )
    a.recommended(
        "Session trace command present (zara-cli session) [L11]",
        p.cli_command("session"),
        "zara-cli must expose `session start|end` and append JSONL to .harness/traces/.",
    )
    a.recommended(
        ".harness/traces/ directory present [L11]",
        p.directory(".harness", "traces"),
        "Create .harness/traces/ with a .gitkeep; gitignore traces.jsonl.",
    )
    a.recommended(
        "Observability / sprint contract protocol documented in instructions [L11]",
        p.matches(ipath, r"(sprint contract|observabilit|session.trace|session-trace|runtime signal|signal collect)"),
        "Add an Observability section: sprint contract, session trace, evaluator rubric.",
    )
    a.recommended(
        "Evaluator rubric referenced in instructions [L11]",
        p.matches(ipath, r"(rubric|evaluator.*score|scoring.*dimension|dimension.*score|A or B|passing.*threshold)"),
        "Reference the evaluator rubric: every dimension must reach B or above.",
    )
    a.recommended(
        "make session-start and session-end targets present [L11]",
        p.make_target("session-start"),
        "Add session-start and session-end targets wrapping `zara-cli session`.",
    )

    # -- L12: Clean State Protocol --------------------------------------------
    a.recommended(
        "templates/clean-state-checklist.md present [L12]",
        p.file("templates", "clean-state-checklist.md"),
        "Create templates/clean-state-checklist.md with the 5 clean-state dimensions.",
    )
    a.recommended(
        "Clean-state command present (zara-cli clean-check) [L12]",
        p.cli_command("clean-check"),
        "zara-cli must expose `clean-check`: idempotent, exits 0 only when all dimensions pass.",
    )
    a.recommended(
        "make clean-check target present [L12]",
        p.make_target("clean-check"),
        "Add a 'clean-check:' target calling `python scripts/zara-cli.py clean-check`.",
    )
    a.recommended(
        "Session exit checklist / clean-state referenced in instructions [L12]",
        p.matches(ipath, r"(clean.state|clean-state|clean_state|session exit|exit checklist|debug artifact|no.*debug|remove.*debug)"),
        "Reference clean-check in the Clock-Out section.",
    )
    a.recommended(
        "Quality document present (module health scores) [L12]",
        p.file("docs", "quality-document.md") or p.file("templates", "quality-document.md"),
        "Create docs/quality-document.md scoring each module A/B/C/D across 5 dimensions.",
    )
    a.recommended(
        "Quality document referenced in instructions [L12]",
        p.matches(ipath, r"(quality.doc|quality doc|quality-doc|quality score|module.*grade|module.*quality|A.*B.*C.*D|grade.*module)"),
        "Reference the quality document in the Clock-Out section.",
    )
    a.recommended(
        "Dual-mode cleanup documented (immediate + periodic/weekly) [L12]",
        p.matches(ipath, r"(periodic|weekly|monthly|dual.mode|immediate.*cleanup|cleanup.*periodic|regular.*sweep|periodic.*sweep)"),
        "Document dual-mode cleanup: every session end plus a periodic full sweep.",
    )

    return a
