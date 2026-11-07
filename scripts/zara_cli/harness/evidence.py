"""Test harness PPC evidence collection and adoption logic."""
import json
import unittest
from datetime import datetime
from pathlib import Path
from tempfile import TemporaryDirectory


class EvidenceCollector:
    """Collects and scores check results from baseline and candidate probes."""
    
    def __init__(self):
        self.baseline_pass = []
        self.candidate_pass = []
    
    def record_baseline(self, check_labels):
        """Record which checks passed in baseline probe."""
        self.baseline_pass = check_labels
    
    def record_candidate(self, check_labels):
        """Record which checks passed in candidate probe."""
        self.candidate_pass = check_labels
    
    def compute_adoption(self):
        """Adoption rule: no contrast, no adoption.
        
        Candidate is adopted if:
        1. Baseline had at least one failure
        2. Candidate passes ALL checks baseline failed
        3. Candidate does not break any check baseline passed
        """
        baseline_set = set(self.baseline_pass)
        candidate_set = set(self.candidate_pass)
        all_checks = baseline_set | candidate_set
        baseline_failed = all_checks - baseline_set
        
        if not baseline_failed:
            return False
        
        candidate_fixed_all = baseline_failed.issubset(candidate_set)
        candidate_broke_none = baseline_set.issubset(candidate_set)
        return candidate_fixed_all and candidate_broke_none
    
    def to_ledger_entry(self, task_name, candidate_path, duration_s, ts=None):
        """Export as ledger.jsonl entry."""
        if ts is None:
            ts = datetime.utcnow().isoformat() + "Z"
        
        return {
            "ts": ts,
            "task": task_name,
            "candidate": candidate_path,
            "baseline_pass": self.baseline_pass,
            "candidate_pass": self.candidate_pass,
            "adopted": self.compute_adoption(),
            "duration_s": duration_s,
        }


class TestEvidenceCollection(unittest.TestCase):
    """Test evidence collection and adoption rule."""
    
    def test_baseline_all_pass_no_adoption(self):
        """No contrast means no adoption."""
        collector = EvidenceCollector()
        collector.record_baseline(["check_a", "check_b"])
        collector.record_candidate(["check_a", "check_b"])
        self.assertFalse(collector.compute_adoption())
    
    def test_candidate_fixes_all_failures(self):
        """Candidate that fixes all baseline failures is adopted."""
        collector = EvidenceCollector()
        collector.record_baseline(["check_a"])
        collector.record_candidate(["check_a", "check_b"])
        self.assertTrue(collector.compute_adoption())
    
    def test_candidate_breaks_existing_check(self):
        """Candidate that breaks a passing check is not adopted."""
        collector = EvidenceCollector()
        collector.record_baseline(["check_a", "check_b"])
        collector.record_candidate(["check_a"])
        self.assertFalse(collector.compute_adoption())
    
    def test_all_baseline_failures_fixed(self):
        """Candidate that fixes all failures and breaks nothing is adopted."""
        collector = EvidenceCollector()
        collector.record_baseline([])
        collector.record_candidate(["check_a", "check_b", "check_c"])
        self.assertTrue(collector.compute_adoption())
    
    def test_ledger_entry_schema(self):
        """Ledger entry has correct schema and adoption status."""
        collector = EvidenceCollector()
        collector.record_baseline(["check_1"])
        collector.record_candidate(["check_1", "check_2"])
        
        entry = collector.to_ledger_entry(
            task_name="test-task",
            candidate_path=".harness/candidates/0001.md",
            duration_s=23.5,
            ts="2026-11-07T13:30:00Z"
        )
        
        self.assertEqual(entry["task"], "test-task")
        self.assertEqual(entry["candidate"], ".harness/candidates/0001.md")
        self.assertEqual(entry["duration_s"], 23.5)
        self.assertTrue(entry["adopted"])
        self.assertIn("ts", entry)
        self.assertIn("baseline_pass", entry)
        self.assertIn("candidate_pass", entry)


class TestLedgerPersistence(unittest.TestCase):
    """Test ledger writing and reading."""
    
    def test_write_and_read_ledger(self):
        """Ledger entries are JSON Lines (one entry per line)."""
        with TemporaryDirectory() as tmpdir:
            ledger_path = Path(tmpdir) / "ledger.jsonl"
            
            entry1 = {
                "ts": "2026-11-07T13:30:00Z",
                "task": "task1",
                "candidate": None,
                "baseline_pass": ["a"],
                "candidate_pass": None,
                "adopted": False,
                "duration_s": 10.0,
            }
            entry2 = {
                "ts": "2026-11-07T13:31:00Z",
                "task": "task1",
                "candidate": ".harness/candidates/0001.md",
                "baseline_pass": ["a"],
                "candidate_pass": ["a", "b"],
                "adopted": True,
                "duration_s": 15.0,
            }
            
            with open(ledger_path, "a") as f:
                f.write(json.dumps(entry1) + "\n")
                f.write(json.dumps(entry2) + "\n")
            
            entries = []
            with open(ledger_path, "r") as f:
                for line in f:
                    entries.append(json.loads(line))
            
            self.assertEqual(len(entries), 2)
            self.assertEqual(entries[0]["task"], "task1")
            self.assertTrue(entries[1]["adopted"])
    
    def test_ledger_append_only(self):
        """Ledger is append-only; previous entries are never modified."""
        with TemporaryDirectory() as tmpdir:
            ledger_path = Path(tmpdir) / "ledger.jsonl"
            
            entry1 = {"ts": "2026-11-07T13:30:00Z", "task": "task1", "adopted": False}
            with open(ledger_path, "w") as f:
                f.write(json.dumps(entry1) + "\n")
            
            entry2 = {"ts": "2026-11-07T13:31:00Z", "task": "task1", "adopted": True}
            with open(ledger_path, "a") as f:
                f.write(json.dumps(entry2) + "\n")
            
            with open(ledger_path, "r") as f:
                lines = f.readlines()
            
            self.assertEqual(len(lines), 2)


if __name__ == "__main__":
    unittest.main()
