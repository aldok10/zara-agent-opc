# LLM Evaluation & Testing

## Why it matters
You cannot improve what you cannot measure. No eval = shipping blind.

## Eval types
- **Deterministic**: exact match, regex, JSON schema validation, contains/not-contains. Fast, cheap, limited scope.
- **Rubric-based**: score 1-5 on criteria (relevance, completeness, accuracy). Human or LLM judge.
- **LLM-as-Judge**: a second LLM grades output against a rubric. Scales human-like judgment; needs calibration.
- **Pairwise**: compare two outputs, pick the better. More reliable than absolute scoring; ideal for A/B.
- **G-Eval**: chain-of-thought scoring — the judge explains reasoning before scoring. More accurate than direct scoring.

## LLM-as-Judge calibration
- Require **Cohen's kappa >= 0.7** vs a human baseline before trusting judge scores
- **Position bias**: randomize order in pairwise comparisons
- **Verbosity bias**: longer answers score unfairly high — penalize or normalize by length
- **Self-enhancement bias**: models prefer their own style — use a *different* model as judge than generator

## Eval dataset
- Minimum **100 test cases** for production, **500+** for enterprise
- Cover diverse inputs, edge cases, and adversarial examples
- Version-control the dataset

## CI gate
Run eval on every PR / model / prompt change. Score below threshold = **block deploy**. Treat exactly like a test suite.

## Regression detection
- Track scores over time
- Alert on **-5% regression**
- Keep eval results in version control for diffing

## Production monitoring
- Sample N% of live traffic, evaluate async
- Dashboard quality trends
- Alert on drift

## Tools
- **RAGAS** (RAG-specific), **DeepEval** (general), **Promptfoo** (prompt testing), **Braintrust** (platform), custom (often simplest for narrow needs)

## Anti-patterns
- No eval (shipping blind)
- Eval on cherry-picked examples
- Judging without calibration
- No regression tests
- Manual-only eval (doesn't scale)
