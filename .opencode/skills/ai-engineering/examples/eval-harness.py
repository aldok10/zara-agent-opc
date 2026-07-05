"""Simple evaluation harness with LLM-as-judge scoring."""

from collections.abc import Callable
from dataclasses import dataclass

import openai


@dataclass
class EvalCase:
    input: str
    expected: str
    actual: str = ""
    score: float = 0.0
    reasoning: str = ""


JUDGE_PROMPT = """Rate how well the actual answer matches the expected answer.
Score from 0.0 to 1.0 where 1.0 is perfect match in meaning.

Expected: {expected}
Actual: {actual}

Respond with JSON: {{"score": <float>, "reasoning": "<brief explanation>"}}"""


def judge(case: EvalCase, model: str = "gpt-4o-mini") -> EvalCase:
    client = openai.OpenAI()
    prompt = JUDGE_PROMPT.format(expected=case.expected, actual=case.actual)
    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
    )
    import json

    result = json.loads(response.choices[0].message.content or "{}")
    case.score = float(result.get("score", 0.0))
    case.reasoning = result.get("reasoning", "")
    return case


def run_eval(
    cases: list[EvalCase],
    system_fn: "Callable[[str], str]",
    threshold: float = 0.7,
) -> dict:
    results = []
    for case in cases:
        case.actual = system_fn(case.input)
        case = judge(case)
        results.append(case)

    scores = [c.score for c in results]
    avg = sum(scores) / len(scores) if scores else 0.0
    passed = avg >= threshold

    return {
        "average_score": round(avg, 3),
        "passed": passed,
        "threshold": threshold,
        "total_cases": len(results),
        "results": [{"input": c.input, "score": c.score, "reasoning": c.reasoning} for c in results],
    }


if __name__ == "__main__":
    test_cases = [
        EvalCase(input="What is Python?", expected="A programming language"),
        EvalCase(input="Capital of France?", expected="Paris"),
    ]

    def mock_system(query: str) -> str:
        return f"Mock answer for: {query}"

    report = run_eval(test_cases, mock_system)
    print(f"Score: {report['average_score']} | Passed: {report['passed']}")
