"""Test task loading and PPC runner orchestration."""
import json
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from datetime import datetime


class TaskDefinition:
    """Task definition loaded from .harness/tasks/*.json"""
    
    def __init__(self, name, prompt, checks, probe_model=True, model_note=""):
        self.name = name
        self.prompt = prompt
        self.checks = checks  # list of {label, cmd}
        self.probe_model = probe_model
        self.model_note = model_note
    
    @classmethod
    def from_dict(cls, data):
        """Load from dict (parsed JSON)."""
        return cls(
            name=data["name"],
            prompt=data["prompt"],
            checks=data["checks"],
            probe_model=data.get("probe_model", True),
            model_note=data.get("model_note", "")
        )
    
    @classmethod
    def from_file(cls, path):
        """Load from .json file."""
        with open(path, "r") as f:
            data = json.load(f)
        return cls.from_dict(data)
    
    def check_labels(self):
        """Return list of check labels."""
        return [check["label"] for check in self.checks]


class TaskLoader:
    """Load tasks from .harness/tasks/ directory."""
    
    def __init__(self, tasks_dir):
        self.tasks_dir = Path(tasks_dir)
    
    def load_all(self):
        """Load all tasks from tasks_dir."""
        tasks = {}
        for task_file in sorted(self.tasks_dir.glob("*.json")):
            task = TaskDefinition.from_file(task_file)
            tasks[task.name] = task
        return tasks
    
    def load_task(self, name):
        """Load a specific task by name."""
        task_file = self.tasks_dir / f"{name}.json"
        if not task_file.exists():
            raise FileNotFoundError(f"Task not found: {name}")
        return TaskDefinition.from_file(task_file)


class ProbeResult:
    """Result of a single probe execution."""
    
    def __init__(self, task_name, candidate_path, passed_checks, failed_checks, duration_s, transcript=""):
        self.task_name = task_name
        self.candidate_path = candidate_path
        self.passed_checks = passed_checks
        self.failed_checks = failed_checks
        self.duration_s = duration_s
        self.transcript = transcript
    
    def get_passed_labels(self):
        return list(self.passed_checks.keys())
    
    def to_dict(self):
        return {
            "task": self.task_name,
            "candidate": self.candidate_path,
            "passed": self.passed_checks,
            "failed": self.failed_checks,
            "duration_s": self.duration_s,
        }


class PPCRunner:
    """Orchestrate Propose–Probe–Compose for a single task."""
    
    def __init__(self, task):
        self.task = task
        self.baseline_result = None
        self.candidate_results = []
    
    def dry_run(self):
        """Plan without executing."""
        return {
            "task": self.task.name,
            "baseline_probes": 1,
            "mode": "baseline-only",
            "cost": 1 if self.task.probe_model else 0,
        }
    
    def probe_baseline(self, transcript="", exit_code=0):
        """Execute baseline probe (mock)."""
        # Determine which checks passed based on exit_code
        # For simplicity: exit_code=0 means all pass, non-zero means all fail
        passed = {} if exit_code != 0 else {label: True for label in self.task.check_labels()}
        failed = {label: True for label in self.task.check_labels() if label not in passed}
        
        self.baseline_result = ProbeResult(
            task_name=self.task.name,
            candidate_path=None,
            passed_checks=passed,
            failed_checks=failed,
            duration_s=10.0,
            transcript=transcript
        )
        return self.baseline_result
    
    def probe_candidate(self, candidate_path, transcript="", exit_code=0):
        """Execute candidate probe (mock)."""
        passed = {} if exit_code != 0 else {label: True for label in self.task.check_labels()}
        failed = {label: True for label in self.task.check_labels() if label not in passed}
        
        result = ProbeResult(
            task_name=self.task.name,
            candidate_path=candidate_path,
            passed_checks=passed,
            failed_checks=failed,
            duration_s=10.0,
            transcript=transcript
        )
        self.candidate_results.append(result)
        return result
    
    def compose_adoption(self):
        """Determine which candidates are adopted (mock of evidence logic)."""
        if not self.baseline_result:
            return []
        
        baseline_passed = set(self.baseline_result.get_passed_labels())
        baseline_failed = set(self.task.check_labels()) - baseline_passed
        
        adopted = []
        for cand_result in self.candidate_results:
            candidate_passed = set(cand_result.get_passed_labels())
            
            # Adoption rule
            fixed_all = baseline_failed.issubset(candidate_passed)
            broke_none = baseline_passed.issubset(candidate_passed)
            
            if baseline_failed and fixed_all and broke_none:
                adopted.append(cand_result.candidate_path)
        
        return adopted


class TestTaskDefinition(unittest.TestCase):
    """Test task loading."""
    
    def test_task_from_dict(self):
        """Load task from dict."""
        data = {
            "name": "test-task",
            "prompt": "Do something",
            "checks": [
                {"label": "check_a", "cmd": "test -f file.txt"},
                {"label": "check_b", "cmd": "grep -q pattern file.txt"}
            ],
            "probe_model": True,
            "model_note": "one model call"
        }
        
        task = TaskDefinition.from_dict(data)
        self.assertEqual(task.name, "test-task")
        self.assertEqual(task.prompt, "Do something")
        self.assertEqual(len(task.checks), 2)
        self.assertTrue(task.probe_model)
    
    def test_task_check_labels(self):
        """Extract check labels."""
        data = {
            "name": "task",
            "prompt": "p",
            "checks": [
                {"label": "a", "cmd": "true"},
                {"label": "b", "cmd": "true"}
            ]
        }
        task = TaskDefinition.from_dict(data)
        self.assertEqual(task.check_labels(), ["a", "b"])
    
    def test_task_from_file(self):
        """Load task from JSON file."""
        with TemporaryDirectory() as tmpdir:
            task_file = Path(tmpdir) / "test.json"
            task_file.write_text(json.dumps({
                "name": "from-file",
                "prompt": "prompt",
                "checks": [{"label": "x", "cmd": "true"}],
                "probe_model": False
            }))
            
            task = TaskDefinition.from_file(task_file)
            self.assertEqual(task.name, "from-file")
            self.assertFalse(task.probe_model)


class TestTaskLoader(unittest.TestCase):
    """Test task directory loading."""
    
    def test_load_all_tasks(self):
        """Load all tasks from directory."""
        with TemporaryDirectory() as tmpdir:
            tasks_dir = Path(tmpdir)
            
            # Write two task files
            (tasks_dir / "task1.json").write_text(json.dumps({
                "name": "task1",
                "prompt": "p1",
                "checks": [{"label": "a", "cmd": "true"}]
            }))
            (tasks_dir / "task2.json").write_text(json.dumps({
                "name": "task2",
                "prompt": "p2",
                "checks": [{"label": "b", "cmd": "true"}]
            }))
            
            loader = TaskLoader(tasks_dir)
            tasks = loader.load_all()
            
            self.assertEqual(len(tasks), 2)
            self.assertIn("task1", tasks)
            self.assertIn("task2", tasks)
    
    def test_load_specific_task(self):
        """Load a specific task by name."""
        with TemporaryDirectory() as tmpdir:
            tasks_dir = Path(tmpdir)
            (tasks_dir / "mytask.json").write_text(json.dumps({
                "name": "mytask",
                "prompt": "p",
                "checks": []
            }))
            
            loader = TaskLoader(tasks_dir)
            task = loader.load_task("mytask")
            self.assertEqual(task.name, "mytask")
    
    def test_load_nonexistent_task(self):
        """Loading nonexistent task raises FileNotFoundError."""
        with TemporaryDirectory() as tmpdir:
            loader = TaskLoader(Path(tmpdir))
            with self.assertRaises(FileNotFoundError):
                loader.load_task("nonexistent")


class TestProbeResult(unittest.TestCase):
    """Test probe result tracking."""
    
    def test_probe_result_passed_labels(self):
        """Get list of passed check labels."""
        result = ProbeResult(
            task_name="task",
            candidate_path=None,
            passed_checks={"a": True, "b": True},
            failed_checks={"c": True},
            duration_s=5.0
        )
        self.assertEqual(set(result.get_passed_labels()), {"a", "b"})


class TestPPCRunner(unittest.TestCase):
    """Test PPC orchestration."""
    
    def setUp(self):
        """Create a test task."""
        self.task = TaskDefinition(
            name="test",
            prompt="test prompt",
            checks=[
                {"label": "check_a", "cmd": "true"},
                {"label": "check_b", "cmd": "true"}
            ],
            probe_model=True
        )
    
    def test_dry_run(self):
        """Dry-run returns plan without executing."""
        runner = PPCRunner(self.task)
        plan = runner.dry_run()
        
        self.assertEqual(plan["task"], "test")
        self.assertEqual(plan["baseline_probes"], 1)
        self.assertEqual(plan["cost"], 1)
    
    def test_baseline_probe_all_pass(self):
        """Baseline probe with all checks passing."""
        runner = PPCRunner(self.task)
        result = runner.probe_baseline(exit_code=0)
        
        self.assertEqual(result.get_passed_labels(), ["check_a", "check_b"])
        self.assertEqual(len(result.failed_checks), 0)
    
    def test_baseline_probe_all_fail(self):
        """Baseline probe with all checks failing."""
        runner = PPCRunner(self.task)
        result = runner.probe_baseline(exit_code=1)
        
        self.assertEqual(result.get_passed_labels(), [])
        self.assertEqual(len(result.failed_checks), 2)
    
    def test_candidate_probe(self):
        """Candidate probe execution."""
        runner = PPCRunner(self.task)
        result = runner.probe_candidate(
            candidate_path=".harness/candidates/0001.md",
            exit_code=0
        )
        
        self.assertEqual(result.candidate_path, ".harness/candidates/0001.md")
        self.assertEqual(len(runner.candidate_results), 1)
    
    def test_compose_adoption_baseline_all_pass(self):
        """No adoption when baseline passes all."""
        runner = PPCRunner(self.task)
        runner.probe_baseline(exit_code=0)  # all pass
        runner.probe_candidate(".harness/candidates/0001.md", exit_code=0)
        
        adopted = runner.compose_adoption()
        self.assertEqual(len(adopted), 0)
    
    def test_compose_adoption_candidate_fixes_all(self):
        """Adoption when candidate fixes all baseline failures."""
        runner = PPCRunner(self.task)
        runner.probe_baseline(exit_code=1)  # all fail
        runner.probe_candidate(".harness/candidates/0001.md", exit_code=0)  # all pass
        
        adopted = runner.compose_adoption()
        self.assertEqual(len(adopted), 1)
        self.assertIn(".harness/candidates/0001.md", adopted)


if __name__ == "__main__":
    unittest.main()
