# Anti-Detection Signals

The top signals that AI detection tools use, ordered by impact. Based on analysis of GPTZero, Originality.ai, ZeroGPT, Turnitin, Winston AI, Copyleaks, and Sapling.

## Detection Signal Hierarchy

1. **Structural burstiness (40%)** — sentence/paragraph length variance is the #1 signal
2. **Vocabulary unpredictability (25%)** — word choices that deviate from highest-probability tokens
3. **Organization unpredictability (20%)** — topic position, depth variance, non-linear structure
4. **Voice markers (10%)** — opinions, asides, self-correction, cognitive artifacts
5. **Surface features (5%)** — contractions, fragments, register mixing

## The Core Problem

Detectors measure DISTRIBUTIONAL UNIFORMITY. They don't look for "AI words" in isolation — they measure how statistically uniform the text is across multiple dimensions simultaneously.

Real human writing is **inconsistently inconsistent**. It has patches of predictability interrupted by genuine surprise. The inconsistency itself is uneven — not applied uniformly like a humanizer tool would do.

## What Each Detector Focuses On

### GPTZero
- Perplexity (word predictability) + Burstiness (sentence-level variation)
- 61% of TOEFL essays falsely flagged — formal correct writing triggers it
- Weak on: short text (<250 words), creative fiction, code-switched text

### Originality.ai
- ELECTRA-style classifier trained on human vs AI pairs (160GB)
- Catches paraphrased AI content at sentence level
- Claims 97% even on "humanized" text
- Weakest on: genuine analysis layered on top of AI text

### Turnitin
- Multi-generation models (AIW-1, AIW-2, AIR-1, anti-humanizer 2025)
- Per-sentence AND per-paragraph scoring
- Academic-calibrated — less sensitive to formal tone (expects it)
- Minimum 300 words required
- 0.2% false positive rate claimed

### ZeroGPT
- Claims 98% accuracy, real-world testing shows 68-75%
- High false positive on formal human writing
- No per-sentence granularity
- Simplistic analysis — easiest to defeat

### Sapling
- Most aggressive/paranoid detector
- Higher false positive rate
- If Sapling passes it, everything passes it
- Use as the "hardest test" benchmark

## Practical Countermeasures (Ranked by Effectiveness)

1. **Sentence length variance** — 3 words to 35 words in same response. CV target: 0.65-0.85
2. **Ban trigger vocabulary** — forces model off highest-probability paths, raises perplexity
3. **Structure unpredictability** — don't always put topic sentence first, vary paragraph length dramatically
4. **Voice injection** — opinions, parenthetical asides, self-corrections
5. **Lexical diversity** — use unusual/specific words, avoid repeating the same transitions

## What Does NOT Work

- "Write like a human" (too vague)
- "Be creative" (model adds adjectives, raises AI score)
- Adding typos (detectors ignore surface errors)
- Increasing temperature (breaks coherence)
- Paraphrasing (structure survives — Originality.ai catches it)
- "Perfectly varied" text (uniform variation is itself a signal)

## The Meta-Rule

The goal is not to apply naturalness rules UNIFORMLY. Apply them UNEVENLY. Some responses more varied than others. Some responses breaking more rules than others. The variation in rule-application is itself what makes text human.
