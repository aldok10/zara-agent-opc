# Documentation Optimization Prompt

You are optimizing documentation for consumption by LLMs (token efficiency + clarity).

## Input

The user will provide:
- Documentation to optimize (skill files, READMEs, reference docs)
- Target audience (AI agent, human developer, both)
- Token budget constraints (if any)
- Priority: what must be preserved vs what can be compressed

## Your Task

Optimize the documentation for LLM consumption:

### 1. Structure Analysis

Evaluate current structure:
- Information hierarchy (most important first?)
- Scanability (can key info be found without reading everything?)
- Chunking (are sections self-contained or cross-referential?)
- Entry points (is it clear where to start reading?)

### 2. Token Reduction Techniques

Apply without losing meaning:
- **Remove filler**: "it is important to note that" -> direct statement
- **Compress examples**: one clear example > three mediocre ones
- **Eliminate redundancy**: say it once, reference it elsewhere
- **Use structured formats**: tables/lists over paragraphs for data
- **Abbreviate patterns**: show one full example, abbreviate rest
- **Remove obvious context**: don't explain what the reader already knows

### 3. Clarity Enhancement

Make instructions machine-parseable:
- One instruction per line/bullet
- Explicit conditions: "IF [condition] THEN [action]"
- Quantify when possible: "max 3 retries" not "a few retries"
- Define terms on first use, never assume
- Prefer positive instructions ("do X") over negative ("don't do Y")

### 4. Information Density Scoring

Measure per section:
- **Signal tokens**: words that convey unique, actionable information
- **Noise tokens**: filler, repetition, obvious statements
- **Ratio**: signal / total (target > 0.8)

### 5. Retrieval Optimization

If docs will be chunked for RAG:
- Each section should be self-contained (not depend on prior sections)
- Include enough context per chunk for standalone understanding
- Key terms in headings for retrieval matching
- Avoid pronouns that require cross-chunk resolution

### 6. Before/After Comparison

For each optimization:
- Show original text
- Show optimized version
- State token reduction percentage
- Confirm no information loss

## Output Format

```markdown
## Optimization Report

### Summary
- Original tokens: [count]
- Optimized tokens: [count]
- Reduction: [percentage]
- Information preserved: [yes/no with details]

### Changes Applied
| Section | Technique | Before (tokens) | After (tokens) | Loss |
|---------|-----------|-----------------|----------------|------|
| ... | ... | ... | ... | none/minor |

### Optimized Document
[The rewritten document]

### Verification
- [Critical fact]: [Still present: yes/no]
- [Key instruction]: [Still clear: yes/no]
```
