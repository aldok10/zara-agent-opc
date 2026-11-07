#!/usr/bin/env python
"""PHASE 4 verification: test harness commands on the repo."""
import sys
from pathlib import Path

# Add scripts to path
sys.path.insert(0, str(Path(__file__).parent))

from zara_cli.harness import HarnessCommandContext, ListCommand, AuditCommand, DryRunCommand, ReflectCommand, LessonsCommand

harness_dir = Path("../.harness")
ctx = HarnessCommandContext(harness_dir)

print("=" * 60)
print("PHASE 4 VERIFICATION: Harness Commands")
print("=" * 60)

# Test 1: List command
print("\n[Test 1] ListCommand")
print("-" * 40)
list_cmd = ListCommand(ctx)
result = list_cmd.execute()
print(f"Tasks found: {result['task_count']}")
print(f"  {result['tasks']}")
print(f"Candidates found: {result['candidate_count']}")
print(f"  {result['candidates']}")

# Test 2: Audit command
print("\n[Test 2] AuditCommand")
print("-" * 40)
audit_cmd = AuditCommand(ctx)
result = audit_cmd.execute()
print(f"Status: {result['status']}")
for check, status in result['checks'].items():
    symbol = "OK" if status else "FAIL"
    print(f"  {check}: {symbol}")
print(f"Tasks in directory: {result['tasks']}")
print(f"Candidates in directory: {result['candidates']}")

# Test 3: DryRun parallel
print("\n[Test 3] DryRunCommand (parallel, k=1)")
print("-" * 40)
dryrun_cmd = DryRunCommand(ctx, "harness-ok", mode="parallel", k=1)
result = dryrun_cmd.execute()
if "error" in result:
    print(f"Error: {result['error']}")
else:
    print(f"Task: {result['task']}")
    print(f"Mode: {result['mode']}")
    print(f"Baseline probes: {result['baseline_probes']}")
    print(f"Candidate probes: {result['candidate_probes']}")
    print(f"Total model calls: {result['total_model_calls']}")
    print(f"Status: {result['status']}")

# Test 4: DryRun sequential
print("\n[Test 4] DryRunCommand (sequential, k=2)")
print("-" * 40)
dryrun_cmd = DryRunCommand(ctx, "harness-ok", mode="sequential", k=2)
result = dryrun_cmd.execute()
if "error" in result:
    print(f"Error: {result['error']}")
else:
    print(f"Task: {result['task']}")
    print(f"Mode: {result['mode']}")
    print(f"Total model calls: {result['total_model_calls']}")
    print(f"Status: {result['status']}")

# Test 5: Reflect command
print("\n[Test 5] ReflectCommand")
print("-" * 40)
reflect_cmd = ReflectCommand(ctx)
result = reflect_cmd.execute()
if "error" in result:
    print(f"Status: {result['error']}")
else:
    print(f"Status: {result['status']}")
    print(f"Probes in ledger: {result['probes']}")
    print(f"Adopted candidates: {result['adopted']}")
    print(f"Reflection file: {result['reflection_path']}")

# Test 6: Lessons command
print("\n[Test 6] LessonsCommand")
print("-" * 40)
lessons_cmd = LessonsCommand(ctx)
result = lessons_cmd.execute()
print(f"Status: {result['status']}")
print(f"Lessons count: {result['lessons_count']}")
if result['lessons']:
    for i, lesson in enumerate(result['lessons'], 1):
        print(f"  Lesson {i}: {lesson['what_changed']}")

print("\n" + "=" * 60)
print("PHASE 4 VERIFICATION: All commands completed")
print("=" * 60)
