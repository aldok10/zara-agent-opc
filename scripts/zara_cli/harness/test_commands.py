"""Test CLI commands for harness PPC and improvement operations."""
import json
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from io import StringIO
import sys


class HarnessCommandContext:
    """Context for harness commands (paths, config)."""
    
    def __init__(self, harness_dir):
        self.harness_dir = Path(harness_dir)
        self.tasks_dir = self.harness_dir / "tasks"
        self.candidates_dir = self.harness_dir / "candidates"
        self.ledger_path = self.harness_dir / "ledger.jsonl"
        self.improvement_dir = self.harness_dir / "improvement"
        self.improvement_dir.mkdir(parents=True, exist_ok=True)
        self.lessons_path = self.improvement_dir / "lessons.jsonl"
        self.reflection_path = self.improvement_dir / "reflection.md"


class HarnessCommand:
    """Base class for harness CLI commands."""
    
    def __init__(self, ctx):
        self.ctx = ctx
    
    def execute(self):
        """Execute the command. Override in subclasses."""
        raise NotImplementedError


class ListCommand(HarnessCommand):
    """zara-cli harness list — list tasks and candidates."""
    
    def execute(self):
        """Return inventory."""
        tasks = []
        candidates = []
        
        if self.ctx.tasks_dir.exists():
            tasks = sorted([f.stem for f in self.ctx.tasks_dir.glob("*.json")])
        
        if self.ctx.candidates_dir.exists():
            candidates = sorted([f.stem for f in self.ctx.candidates_dir.glob("*.md")])
        
        return {
            "tasks": tasks,
            "candidates": candidates,
            "task_count": len(tasks),
            "candidate_count": len(candidates),
        }


class DryRunCommand(HarnessCommand):
    """zara-cli harness ppc --task <task> --dry-run — plan without model calls."""
    
    def __init__(self, ctx, task_name, mode="parallel", k=1):
        super().__init__(ctx)
        self.task_name = task_name
        self.mode = mode
        self.k = k
    
    def execute(self):
        """Return plan."""
        # Load task to verify it exists
        task_file = self.ctx.tasks_dir / f"{self.task_name}.json"
        if not task_file.exists():
            return {"error": f"Task not found: {self.task_name}"}
        
        with open(task_file) as f:
            task_data = json.load(f)
        
        probe_model = task_data.get("probe_model", True)
        
        if self.mode == "parallel":
            baseline_probes = 1
            candidate_probes = 2 * self.k
            total_calls = (1 + candidate_probes) if probe_model else 0
        else:  # sequential
            baseline_probes = 1
            candidate_probes = self.k
            total_calls = (1 + candidate_probes) if probe_model else 0
        
        return {
            "task": self.task_name,
            "mode": self.mode,
            "k": self.k,
            "baseline_probes": baseline_probes,
            "candidate_probes": candidate_probes,
            "total_model_calls": total_calls,
            "status": "ok"
        }


class ReflectCommand(HarnessCommand):
    """zara-cli harness reflect — generate reflection.md from ledger."""
    
    def execute(self):
        """Generate reflection and return status."""
        if not self.ctx.ledger_path.exists():
            return {"error": "Ledger not found", "status": "error"}
        
        # Count entries
        entries = 0
        adopted = 0
        with open(self.ctx.ledger_path) as f:
            for line in f:
                if line.strip():
                    entries += 1
                    data = json.loads(line)
                    if data.get("adopted"):
                        adopted += 1
        
        # Generate reflection.md
        reflection = f"""# Improvement Harness Reflection

Generated: 2026-11-07T13:37:00Z

## Summary

- Total probes: {entries}
- Adopted candidates: {adopted}
- Adoption rate: {100 * adopted // max(1, entries)}%

## Next Steps

Extract lessons from adopted candidates to guide future refinement.
"""
        
        with open(self.ctx.reflection_path, "w") as f:
            f.write(reflection)
        
        return {
            "status": "ok",
            "probes": entries,
            "adopted": adopted,
            "reflection_path": str(self.ctx.reflection_path)
        }


class LessonsCommand(HarnessCommand):
    """zara-cli harness lessons — show improvement lessons."""
    
    def execute(self):
        """Return lessons from lessons.jsonl."""
        lessons = []
        
        if self.ctx.lessons_path.exists():
            with open(self.ctx.lessons_path) as f:
                for line in f:
                    if line.strip():
                        lessons.append(json.loads(line))
        
        return {
            "status": "ok",
            "lessons_count": len(lessons),
            "lessons": lessons
        }


class AuditCommand(HarnessCommand):
    """zara-cli harness audit — verify harness health."""
    
    def execute(self):
        """Audit harness structure."""
        checks = {
            "harness_dir_exists": self.ctx.harness_dir.exists(),
            "tasks_dir_exists": self.ctx.tasks_dir.exists(),
            "candidates_dir_exists": self.ctx.candidates_dir.exists(),
            "ledger_exists": self.ctx.ledger_path.exists(),
            "improvement_dir_exists": self.ctx.improvement_dir.exists(),
        }
        
        # Count files
        tasks = len(list(self.ctx.tasks_dir.glob("*.json"))) if self.ctx.tasks_dir.exists() else 0
        candidates = len(list(self.ctx.candidates_dir.glob("*.md"))) if self.ctx.candidates_dir.exists() else 0
        
        all_ok = all(checks.values())
        
        return {
            "status": "ok" if all_ok else "warning",
            "checks": checks,
            "tasks": tasks,
            "candidates": candidates,
        }


class TestListCommand(unittest.TestCase):
    """Test list command."""
    
    def test_list_empty(self):
        """List with no tasks or candidates."""
        with TemporaryDirectory() as tmpdir:
            harness_dir = Path(tmpdir) / ".harness"
            harness_dir.mkdir()
            (harness_dir / "tasks").mkdir()
            (harness_dir / "candidates").mkdir()
            
            ctx = HarnessCommandContext(harness_dir)
            cmd = ListCommand(ctx)
            result = cmd.execute()
            
            self.assertEqual(result["task_count"], 0)
            self.assertEqual(result["candidate_count"], 0)
    
    def test_list_with_items(self):
        """List with tasks and candidates."""
        with TemporaryDirectory() as tmpdir:
            harness_dir = Path(tmpdir) / ".harness"
            harness_dir.mkdir()
            
            tasks_dir = harness_dir / "tasks"
            tasks_dir.mkdir()
            (tasks_dir / "task1.json").touch()
            (tasks_dir / "task2.json").touch()
            
            cand_dir = harness_dir / "candidates"
            cand_dir.mkdir()
            (cand_dir / "cand1.md").touch()
            
            ctx = HarnessCommandContext(harness_dir)
            cmd = ListCommand(ctx)
            result = cmd.execute()
            
            self.assertEqual(result["task_count"], 2)
            self.assertEqual(result["candidate_count"], 1)
            self.assertIn("task1", result["tasks"])
            self.assertIn("cand1", result["candidates"])


class TestDryRunCommand(unittest.TestCase):
    """Test dry-run command."""
    
    def test_dry_run_parallel(self):
        """Dry-run parallel mode."""
        with TemporaryDirectory() as tmpdir:
            harness_dir = Path(tmpdir) / ".harness"
            harness_dir.mkdir()
            
            tasks_dir = harness_dir / "tasks"
            tasks_dir.mkdir()
            (tasks_dir / "task1.json").write_text(json.dumps({
                "name": "task1",
                "prompt": "p",
                "checks": [],
                "probe_model": True
            }))
            
            ctx = HarnessCommandContext(harness_dir)
            cmd = DryRunCommand(ctx, "task1", mode="parallel", k=2)
            result = cmd.execute()
            
            self.assertEqual(result["status"], "ok")
            self.assertEqual(result["mode"], "parallel")
            self.assertEqual(result["total_model_calls"], 5)  # 1 + 2*2
    
    def test_dry_run_sequential(self):
        """Dry-run sequential mode."""
        with TemporaryDirectory() as tmpdir:
            harness_dir = Path(tmpdir) / ".harness"
            harness_dir.mkdir()
            
            tasks_dir = harness_dir / "tasks"
            tasks_dir.mkdir()
            (tasks_dir / "task1.json").write_text(json.dumps({
                "name": "task1",
                "prompt": "p",
                "checks": [],
                "probe_model": True
            }))
            
            ctx = HarnessCommandContext(harness_dir)
            cmd = DryRunCommand(ctx, "task1", mode="sequential", k=2)
            result = cmd.execute()
            
            self.assertEqual(result["total_model_calls"], 3)  # 1 + 2
    
    def test_dry_run_task_not_found(self):
        """Dry-run with nonexistent task."""
        with TemporaryDirectory() as tmpdir:
            harness_dir = Path(tmpdir) / ".harness"
            harness_dir.mkdir()
            (harness_dir / "tasks").mkdir()
            
            ctx = HarnessCommandContext(harness_dir)
            cmd = DryRunCommand(ctx, "nonexistent", mode="parallel", k=1)
            result = cmd.execute()
            
            self.assertIn("error", result)


class TestReflectCommand(unittest.TestCase):
    """Test reflect command."""
    
    def test_reflect_generates_file(self):
        """Reflect generates reflection.md."""
        with TemporaryDirectory() as tmpdir:
            harness_dir = Path(tmpdir) / ".harness"
            harness_dir.mkdir()
            (harness_dir / "improvement").mkdir()
            
            ledger_path = harness_dir / "ledger.jsonl"
            with open(ledger_path, "w") as f:
                f.write(json.dumps({"task": "t1", "adopted": False}) + "\n")
                f.write(json.dumps({"task": "t1", "adopted": True}) + "\n")
            
            ctx = HarnessCommandContext(harness_dir)
            cmd = ReflectCommand(ctx)
            result = cmd.execute()
            
            self.assertEqual(result["status"], "ok")
            self.assertEqual(result["probes"], 2)
            self.assertEqual(result["adopted"], 1)
            
            # Check file was created
            self.assertTrue(ctx.reflection_path.exists())
            content = ctx.reflection_path.read_text()
            self.assertIn("Adoption rate", content)
    
    def test_reflect_no_ledger(self):
        """Reflect with no ledger."""
        with TemporaryDirectory() as tmpdir:
            harness_dir = Path(tmpdir) / ".harness"
            harness_dir.mkdir()
            (harness_dir / "improvement").mkdir()
            
            ctx = HarnessCommandContext(harness_dir)
            cmd = ReflectCommand(ctx)
            result = cmd.execute()
            
            self.assertIn("error", result)


class TestLessonsCommand(unittest.TestCase):
    """Test lessons command."""
    
    def test_lessons_empty(self):
        """Lessons with no lessons file."""
        with TemporaryDirectory() as tmpdir:
            harness_dir = Path(tmpdir) / ".harness"
            harness_dir.mkdir()
            (harness_dir / "improvement").mkdir()
            
            ctx = HarnessCommandContext(harness_dir)
            cmd = LessonsCommand(ctx)
            result = cmd.execute()
            
            self.assertEqual(result["lessons_count"], 0)
    
    def test_lessons_with_entries(self):
        """Lessons with entries."""
        with TemporaryDirectory() as tmpdir:
            harness_dir = Path(tmpdir) / ".harness"
            harness_dir.mkdir()
            (harness_dir / "improvement").mkdir()
            
            lessons_path = harness_dir / "improvement" / "lessons.jsonl"
            with open(lessons_path, "w") as f:
                f.write(json.dumps({"what_changed": "x", "confidence": 0.8}) + "\n")
            
            ctx = HarnessCommandContext(harness_dir)
            cmd = LessonsCommand(ctx)
            result = cmd.execute()
            
            self.assertEqual(result["lessons_count"], 1)
            self.assertEqual(result["lessons"][0]["confidence"], 0.8)


class TestAuditCommand(unittest.TestCase):
    """Test audit command."""
    
    def test_audit_healthy(self):
        """Audit a healthy harness."""
        with TemporaryDirectory() as tmpdir:
            harness_dir = Path(tmpdir) / ".harness"
            harness_dir.mkdir()
            (harness_dir / "tasks").mkdir()
            (harness_dir / "candidates").mkdir()
            (harness_dir / "improvement").mkdir()
            (harness_dir / "ledger.jsonl").touch()
            
            ctx = HarnessCommandContext(harness_dir)
            cmd = AuditCommand(ctx)
            result = cmd.execute()
            
            self.assertEqual(result["status"], "ok")
            self.assertTrue(all(result["checks"].values()))
    
    def test_audit_missing_dirs(self):
        """Audit with missing directories."""
        with TemporaryDirectory() as tmpdir:
            harness_dir = Path(tmpdir) / ".harness"
            harness_dir.mkdir()
            
            ctx = HarnessCommandContext(harness_dir)
            cmd = AuditCommand(ctx)
            result = cmd.execute()
            
            self.assertEqual(result["status"], "warning")
            self.assertFalse(all(result["checks"].values()))


if __name__ == "__main__":
    unittest.main()
