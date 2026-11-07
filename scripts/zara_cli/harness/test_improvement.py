"""Test ledger management and improvement harness (harnessing-level recursion)."""
import json
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from datetime import datetime


class LedgerEntry:
    """Single entry in ledger.jsonl."""
    
    def __init__(self, ts, task, candidate, baseline_pass, candidate_pass, adopted, duration_s):
        self.ts = ts
        self.task = task
        self.candidate = candidate
        self.baseline_pass = baseline_pass
        self.candidate_pass = candidate_pass
        self.adopted = adopted
        self.duration_s = duration_s
    
    def to_dict(self):
        return {
            "ts": self.ts,
            "task": self.task,
            "candidate": self.candidate,
            "baseline_pass": self.baseline_pass,
            "candidate_pass": self.candidate_pass,
            "adopted": self.adopted,
            "duration_s": self.duration_s,
        }
    
    @classmethod
    def from_dict(cls, data):
        return cls(
            ts=data["ts"],
            task=data["task"],
            candidate=data.get("candidate"),
            baseline_pass=data["baseline_pass"],
            candidate_pass=data.get("candidate_pass"),
            adopted=data["adopted"],
            duration_s=data["duration_s"],
        )


class LedgerManager:
    """Manage ledger.jsonl (append-only probe records)."""
    
    def __init__(self, ledger_path):
        self.ledger_path = Path(ledger_path)
        self.ledger_path.parent.mkdir(parents=True, exist_ok=True)
    
    def append(self, entry):
        """Append entry to ledger.jsonl."""
        with open(self.ledger_path, "a") as f:
            f.write(json.dumps(entry.to_dict()) + "\n")
    
    def read_all(self):
        """Read all entries from ledger."""
        entries = []
        if not self.ledger_path.exists():
            return entries
        
        with open(self.ledger_path, "r") as f:
            for line in f:
                if line.strip():
                    entries.append(LedgerEntry.from_dict(json.loads(line)))
        return entries
    
    def query_task(self, task_name):
        """Get all entries for a task."""
        return [e for e in self.read_all() if e.task == task_name]
    
    def query_adopted(self):
        """Get all adopted candidates."""
        return [e for e in self.read_all() if e.adopted and e.candidate]
    
    def count_adopted_by_task(self):
        """Count adopted candidates per task."""
        counts = {}
        for entry in self.read_all():
            if entry.adopted and entry.candidate:
                counts[entry.task] = counts.get(entry.task, 0) + 1
        return counts


class Lesson:
    """Evidence-backed lesson from harnessing-level recursion."""
    
    def __init__(self, what_changed, why_it_worked, when_apply, confidence, adopted_from):
        self.what_changed = what_changed
        self.why_it_worked = why_it_worked
        self.when_apply = when_apply  # list of domains/task types
        self.confidence = confidence  # 0.0 to 1.0
        self.adopted_from = adopted_from  # list of task names
    
    def to_dict(self):
        return {
            "what_changed": self.what_changed,
            "why_it_worked": self.why_it_worked,
            "when_apply": self.when_apply,
            "confidence": self.confidence,
            "adopted_from": self.adopted_from,
        }
    
    @classmethod
    def from_dict(cls, data):
        return cls(
            what_changed=data["what_changed"],
            why_it_worked=data["why_it_worked"],
            when_apply=data.get("when_apply", []),
            confidence=data.get("confidence", 0.0),
            adopted_from=data.get("adopted_from", []),
        )


class ImprovementHarness:
    """Harnessing-level recursion: extract and persist lessons from ledger."""
    
    def __init__(self, lessons_path):
        self.lessons_path = Path(lessons_path)
        self.lessons_path.parent.mkdir(parents=True, exist_ok=True)
    
    def append_lesson(self, lesson):
        """Append lesson to lessons.jsonl."""
        with open(self.lessons_path, "a") as f:
            f.write(json.dumps(lesson.to_dict()) + "\n")
    
    def read_lessons(self):
        """Read all lessons."""
        lessons = []
        if not self.lessons_path.exists():
            return lessons
        
        with open(self.lessons_path, "r") as f:
            for line in f:
                if line.strip():
                    lessons.append(Lesson.from_dict(json.loads(line)))
        return lessons
    
    def extract_lessons_from_ledger(self, ledger_entries, min_confidence=0.7):
        """Extract lessons from adopted candidates.
        
        Returns list of Lesson objects with confidence >= min_confidence.
        """
        lessons = []
        
        # Group adopted entries by candidate path
        by_candidate = {}
        for entry in ledger_entries:
            if entry.adopted and entry.candidate:
                if entry.candidate not in by_candidate:
                    by_candidate[entry.candidate] = []
                by_candidate[entry.candidate].append(entry)
        
        # For each adopted candidate, generate a lesson
        for candidate_path, entries in by_candidate.items():
            tasks = [e.task for e in entries]
            
            # Simple heuristic: confidence = number of tasks that adopted / total tasks tested
            # For now, just set confidence based on adoption count
            confidence = min(1.0, len(tasks) / 3.0)  # max at 3 tasks
            
            lesson = Lesson(
                what_changed=f"Applied overlay from {candidate_path}",
                why_it_worked=f"Fixed failures in {len(tasks)} task(s)",
                when_apply=["general"],  # TODO: infer from task metadata
                confidence=confidence,
                adopted_from=tasks,
            )
            
            if confidence >= min_confidence:
                lessons.append(lesson)
        
        return lessons
    
    def generate_reflection(self, ledger_entries, output_path):
        """Generate reflection.md summary from ledger."""
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        adopted = [e for e in ledger_entries if e.adopted]
        total = len(ledger_entries)
        
        reflection = f"""# Improvement Harness Reflection

Generated: {datetime.utcnow().isoformat()}Z

## Summary

- Total probes: {total}
- Adopted candidates: {len(adopted)}
- Adoption rate: {100 * len(adopted) // max(1, total)}%

## Adopted Candidates

"""
        
        for entry in adopted:
            if entry.candidate:
                reflection += f"- {entry.candidate} (task: {entry.task})\n"
        
        reflection += f"\n## Lessons\n\nExtract lessons from adopted candidates to guide future refinement.\n"
        
        with open(output_path, "w") as f:
            f.write(reflection)


class TestLedgerEntry(unittest.TestCase):
    """Test ledger entry schema."""
    
    def test_entry_to_dict(self):
        """Convert entry to dict."""
        entry = LedgerEntry(
            ts="2026-11-07T13:30:00Z",
            task="task1",
            candidate=".harness/candidates/0001.md",
            baseline_pass=["a"],
            candidate_pass=["a", "b"],
            adopted=True,
            duration_s=15.0
        )
        
        d = entry.to_dict()
        self.assertEqual(d["task"], "task1")
        self.assertTrue(d["adopted"])
    
    def test_entry_from_dict(self):
        """Load entry from dict."""
        d = {
            "ts": "2026-11-07T13:30:00Z",
            "task": "task1",
            "candidate": None,
            "baseline_pass": ["x"],
            "candidate_pass": None,
            "adopted": False,
            "duration_s": 10.0,
        }
        
        entry = LedgerEntry.from_dict(d)
        self.assertEqual(entry.task, "task1")
        self.assertIsNone(entry.candidate)


class TestLedgerManager(unittest.TestCase):
    """Test ledger persistence and queries."""
    
    def test_append_and_read(self):
        """Append entries and read them back."""
        with TemporaryDirectory() as tmpdir:
            ledger = LedgerManager(Path(tmpdir) / "ledger.jsonl")
            
            entry1 = LedgerEntry(
                ts="2026-11-07T13:30:00Z",
                task="task1",
                candidate=None,
                baseline_pass=[],
                candidate_pass=None,
                adopted=False,
                duration_s=10.0
            )
            entry2 = LedgerEntry(
                ts="2026-11-07T13:31:00Z",
                task="task1",
                candidate=".harness/candidates/0001.md",
                baseline_pass=[],
                candidate_pass=["a", "b"],
                adopted=True,
                duration_s=15.0
            )
            
            ledger.append(entry1)
            ledger.append(entry2)
            
            entries = ledger.read_all()
            self.assertEqual(len(entries), 2)
            self.assertTrue(entries[1].adopted)
    
    def test_query_task(self):
        """Query entries by task name."""
        with TemporaryDirectory() as tmpdir:
            ledger = LedgerManager(Path(tmpdir) / "ledger.jsonl")
            
            ledger.append(LedgerEntry("ts1", "task1", None, [], None, False, 1.0))
            ledger.append(LedgerEntry("ts2", "task2", None, [], None, False, 1.0))
            ledger.append(LedgerEntry("ts3", "task1", None, [], None, False, 1.0))
            
            task1_entries = ledger.query_task("task1")
            self.assertEqual(len(task1_entries), 2)
    
    def test_query_adopted(self):
        """Query adopted candidates."""
        with TemporaryDirectory() as tmpdir:
            ledger = LedgerManager(Path(tmpdir) / "ledger.jsonl")
            
            ledger.append(LedgerEntry("ts1", "t1", None, [], None, False, 1.0))
            ledger.append(LedgerEntry("ts2", "t1", "cand1", [], ["a"], True, 1.0))
            ledger.append(LedgerEntry("ts3", "t2", "cand2", [], ["b"], True, 1.0))
            
            adopted = ledger.query_adopted()
            self.assertEqual(len(adopted), 2)
    
    def test_count_adopted_by_task(self):
        """Count adopted candidates per task."""
        with TemporaryDirectory() as tmpdir:
            ledger = LedgerManager(Path(tmpdir) / "ledger.jsonl")
            
            ledger.append(LedgerEntry("ts1", "t1", "c1", [], ["a"], True, 1.0))
            ledger.append(LedgerEntry("ts2", "t1", "c2", [], ["b"], True, 1.0))
            ledger.append(LedgerEntry("ts3", "t2", "c3", [], ["c"], True, 1.0))
            
            counts = ledger.count_adopted_by_task()
            self.assertEqual(counts.get("t1"), 2)
            self.assertEqual(counts.get("t2"), 1)


class TestLesson(unittest.TestCase):
    """Test lesson schema."""
    
    def test_lesson_to_dict(self):
        """Convert lesson to dict."""
        lesson = Lesson(
            what_changed="Added explicit verification",
            why_it_worked="Reduced hallucination",
            when_apply=["code-gen", "verification"],
            confidence=0.85,
            adopted_from=["task1", "task2"]
        )
        
        d = lesson.to_dict()
        self.assertEqual(d["confidence"], 0.85)
        self.assertIn("code-gen", d["when_apply"])
    
    def test_lesson_from_dict(self):
        """Load lesson from dict."""
        d = {
            "what_changed": "x",
            "why_it_worked": "y",
            "when_apply": ["a"],
            "confidence": 0.7,
            "adopted_from": ["t1"]
        }
        
        lesson = Lesson.from_dict(d)
        self.assertEqual(lesson.confidence, 0.7)


class TestImprovementHarness(unittest.TestCase):
    """Test improvement harness (harnessing-level recursion)."""
    
    def test_append_and_read_lessons(self):
        """Append lessons and read them."""
        with TemporaryDirectory() as tmpdir:
            harness = ImprovementHarness(Path(tmpdir) / "lessons.jsonl")
            
            lesson1 = Lesson("x", "y", ["a"], 0.8, ["t1"])
            lesson2 = Lesson("x2", "y2", ["b"], 0.9, ["t2"])
            
            harness.append_lesson(lesson1)
            harness.append_lesson(lesson2)
            
            lessons = harness.read_lessons()
            self.assertEqual(len(lessons), 2)
            self.assertEqual(lessons[0].confidence, 0.8)
    
    def test_extract_lessons_from_ledger(self):
        """Extract lessons from adopted ledger entries."""
        entries = [
            LedgerEntry("ts1", "t1", "c1", ["a"], ["a", "b"], True, 1.0),
            LedgerEntry("ts2", "t1", "c1", ["a"], ["a", "b"], True, 1.0),
            LedgerEntry("ts3", "t2", "c2", ["x"], ["x", "y"], True, 1.0),
        ]
        
        with TemporaryDirectory() as tmpdir:
            harness = ImprovementHarness(Path(tmpdir) / "lessons.jsonl")
            lessons = harness.extract_lessons_from_ledger(entries, min_confidence=0.5)
            
            # c1 adopted in 2 tasks -> confidence = 2/3 = 0.67
            # c2 adopted in 1 task -> confidence = 1/3 = 0.33 (filtered out)
            self.assertEqual(len(lessons), 1)
            self.assertGreaterEqual(lessons[0].confidence, 0.5)
    
    def test_generate_reflection(self):
        """Generate reflection.md from ledger."""
        entries = [
            LedgerEntry("ts1", "t1", None, [], None, False, 1.0),
            LedgerEntry("ts2", "t1", "c1", ["a"], ["a", "b"], True, 1.0),
            LedgerEntry("ts3", "t2", "c2", ["x"], ["x", "y"], True, 1.0),
        ]
        
        with TemporaryDirectory() as tmpdir:
            harness = ImprovementHarness(Path(tmpdir) / "lessons.jsonl")
            reflection_path = Path(tmpdir) / "reflection.md"
            
            harness.generate_reflection(entries, reflection_path)
            
            content = reflection_path.read_text()
            self.assertIn("Adoption rate", content)
            self.assertIn("c1", content)
            self.assertIn("c2", content)


if __name__ == "__main__":
    unittest.main()
