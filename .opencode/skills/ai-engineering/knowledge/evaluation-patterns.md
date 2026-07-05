# Evaluation Patterns

Deep technical reference for evaluating LLM systems: offline evals, LLM-as-judge, RAGAS, custom metrics, and CI integration.

---

## Why Evaluation Is Hard

LLM outputs are non-deterministic, subjective, and multi-dimensional. Traditional software testing (exact match, assertion) breaks down. You need:
- Metrics that tolerate variation in correct answers
- Judges that understand semantic equivalence
- Statistical approaches that account for high variance
- Multiple metrics per evaluation (no single score captures quality)

---

## Offline Evaluation

### Golden Set Comparison

Curate a dataset of (input, expected_output) pairs. Run your system, compare results. Works best when there are clear correct answers.

```python
import json
from dataclasses import dataclass

@dataclass
class EvalCase:
    input: str
    expected: str
    metadata: dict

def run_eval(cases: list[EvalCase], system_fn) -> dict:
    results = []
    for case in cases:
        actual = system_fn(case.input)
        score = judge(case.expected, actual, case.input)
        results.append({"input": case.input, "score": score, "actual": actual})

    return {
        "mean_score": sum(r["score"] for r in results) / len(results),
        "pass_rate": sum(1 for r in results if r["score"] >= 0.8) / len(results),
        "results": results,
    }
```

### Benchmark Datasets

Build task-specific eval sets:
- 50-100 cases minimum for statistical significance
- Cover edge cases, adversarial inputs, and typical usage
- Include difficulty levels (easy/medium/hard)
- Version your eval sets -- they evolve with the product

---

## LLM-as-Judge

Use a strong model to evaluate outputs from your system. More scalable than human eval, correlates well with human judgment when calibrated.

### Rubric Design

Define explicit scoring criteria. Vague rubrics produce inconsistent scores.

```python
RUBRIC = """
Score the response on a scale of 1-5:

5 - Completely correct, well-structured, addresses all parts of the question
4 - Mostly correct with minor omissions or imprecisions
3 - Partially correct but missing important aspects
2 - Contains significant errors or misunderstandings
1 - Completely wrong or irrelevant

Consider:
- Factual accuracy (weight: 40%)
- Completeness (weight: 30%)
- Clarity and structure (weight: 20%)
- Relevance to the question (weight: 10%)
"""

def llm_judge(question: str, response: str, reference: str = None) -> dict:
    prompt = f"""Evaluate this response.

Question: {question}
Response: {response}
{"Reference answer: " + reference if reference else ""}

{RUBRIC}

Provide your score and a brief justification."""

    judgment = llm.generate(prompt, model="gpt-4o")
    return parse_judgment(judgment)
```

### Calibration

- Run judge on known-good and known-bad examples first
- Measure inter-rater agreement (judge vs human, judge vs judge)
- Use multiple judge calls and average (reduces noise)
- Provide reference answers when available (anchors scoring)

### Pairwise Comparison

Instead of absolute scoring, compare two outputs: "Which response better answers the question?" More reliable than absolute scoring for subtle quality differences.

```python
def pairwise_judge(question: str, response_a: str, response_b: str) -> str:
    prompt = f"""Which response better answers the question?

Question: {question}

Response A:
{response_a}

Response B:
{response_b}

Reply with "A", "B", or "TIE" followed by a brief explanation."""

    return llm.generate(prompt)
```

---

## RAGAS Metrics

Standard framework for RAG evaluation with four core metrics:

### Context Precision

Are the retrieved chunks actually relevant to answering the question? Measures retrieval quality.

### Context Recall

Were all the chunks needed to answer the question actually retrieved? Identifies missing context.

### Faithfulness

Is the generated answer supported by the retrieved context? Detects hallucination.

### Answer Relevance

Does the answer actually address the question asked? Catches tangential responses.

```python
from ragas import evaluate
from ragas.metrics import (
    faithfulness,
    answer_relevancy,
    context_precision,
    context_recall,
)
from datasets import Dataset

eval_data = {
    "question": ["What is the return policy?"],
    "answer": ["Items can be returned within 30 days."],
    "contexts": [["Our return policy allows 30-day returns for unused items."]],
    "ground_truth": ["Items can be returned within 30 days if unused."],
}

dataset = Dataset.from_dict(eval_data)
results = evaluate(dataset=dataset, metrics=[
    faithfulness, answer_relevancy, context_precision, context_recall
])
print(results)
```

---

## Custom Metrics

### Domain-Specific Metrics

Build metrics tailored to your use case:

```python
def code_correctness(generated_code: str, test_cases: list[dict]) -> float:
    passed = 0
    for test in test_cases:
        try:
            result = execute_in_sandbox(generated_code, test["input"])
            if result == test["expected"]:
                passed += 1
        except Exception:
            pass
    return passed / len(test_cases)

def format_compliance(output: str, schema: dict) -> float:
    try:
        parsed = json.loads(output)
        validate(parsed, schema)
        return 1.0
    except (json.JSONDecodeError, ValidationError):
        return 0.0
```

### Task-Specific Metrics

| Task | Metric | Implementation |
|------|--------|----------------|
| Summarization | Coverage + conciseness | LLM judge with rubric |
| Classification | Precision/recall/F1 | Standard ML metrics |
| Code generation | Pass@k | Run test suite k times |
| Translation | BLEU + semantic similarity | Automated + embedding comparison |
| Extraction | Field-level accuracy | Exact/fuzzy match per field |

---

## A/B Testing for AI Systems

High variance in LLM outputs requires more samples than traditional A/B tests.

- Use paired comparisons (same input, both variants) to reduce variance
- Minimum 200-500 paired samples for statistical significance
- Track multiple metrics simultaneously (quality, latency, cost)
- Use bootstrap confidence intervals rather than t-tests for non-normal distributions

```python
import numpy as np

def bootstrap_ci(scores_a, scores_b, n_bootstrap=10000, ci=0.95):
    diffs = []
    n = len(scores_a)
    for _ in range(n_bootstrap):
        idx = np.random.randint(0, n, size=n)
        diff = np.mean(scores_a[idx]) - np.mean(scores_b[idx])
        diffs.append(diff)

    lower = np.percentile(diffs, (1 - ci) / 2 * 100)
    upper = np.percentile(diffs, (1 + ci) / 2 * 100)
    return {"mean_diff": np.mean(diffs), "ci_lower": lower, "ci_upper": upper}
```

---

## Regression Testing

### Behavioral Assertions

Define expected behaviors as test cases. Run after every prompt/model change.

```python
BEHAVIORAL_TESTS = [
    {"input": "DROP TABLE users", "assert": "refuses_sql_injection"},
    {"input": "What's 2+2?", "assert": "contains_4"},
    {"input": "Summarize this empty doc", "assert": "handles_gracefully"},
]

def assert_behavior(response: str, assertion: str) -> bool:
    assertions = {
        "refuses_sql_injection": lambda r: "cannot" in r.lower() or "won't" in r.lower(),
        "contains_4": lambda r: "4" in r,
        "handles_gracefully": lambda r: "error" not in r.lower(),
    }
    return assertions[assertion](response)
```

### Snapshot Testing

Save outputs for a fixed eval set. After changes, compare new outputs against snapshots. Flag regressions for human review.

---

## Evaluation Infrastructure

### CI Integration

```yaml
# .github/workflows/eval.yml
name: LLM Eval
on:
  pull_request:
    paths: ["prompts/**", "src/agents/**"]

jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pip install -r requirements-eval.txt
      - run: python run_evals.py --suite=regression
      - run: python run_evals.py --suite=quality --threshold=0.85
      - uses: actions/upload-artifact@v4
        with:
          name: eval-results
          path: eval_results/
```

### Eval Dataset Management

- Store eval datasets in version control (or a separate data repo)
- Tag datasets with creation date and domain coverage
- Retire cases that no longer reflect real usage
- Add cases from production failures (every bug becomes a test case)
- Separate "regression" (must pass) from "quality" (track trends) suites

---

## Practical Workflow

1. Start with 20-50 golden cases covering core functionality
2. Add LLM-as-judge for subjective quality scoring
3. Run evals on every prompt/model change (CI)
4. Track metrics over time -- detect degradation early
5. Add cases from production failures
6. Graduate important quality checks to hard assertions
7. Review and update rubrics quarterly as product evolves
