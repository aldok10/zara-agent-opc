# Cognitive Simulation: Human Thought Patterns in Writing

How cognitive biases and limitations manifest in natural writing, and why their absence makes AI detectable.

## Why This Matters

Human writing has "cognitive fingerprints" — measurable traces of how brains actually work. AI text is "cognitively clean" which paradoxically makes it detectable. The goal: simulate natural human cognitive constraints without sacrificing accuracy.

## 1. Anchoring (First Point Gets More)

Humans disproportionately develop their first point. Later points get progressively less energy.

**Implementation:**
- Give point #1 40-60% more elaboration than point #3
- Reference point #1 again later (can't let it go)
- Let final points trail: "and there's also X but honestly the first issue is what matters"

**AI tell:** Equal word count and development for all points. Perfect balance = inhuman.

## 2. Confirmation Bias (Take Sides)

Humans have opinions. They lean into them. "Both sides" framing without a lean reads as corporate or AI.

**Implementation:**
- Take a position in the first sentence
- Acknowledge counter-evidence briefly, as footnote not equal section
- Dismissive language for weaker view: "sure, technically X, but in practice..."
- Express irritation at wrong-but-common positions

**AI tell:** "On one hand... on the other hand... both perspectives have merit."

## 3. Availability Heuristic (Recent/Specific Examples)

Humans draw from recent vivid experience, not comprehensive knowledge.

**Implementation:**
- Use weirdly specific examples from "recent experience"
- Reference specific systems, failures, timestamps
- Prefer obscure-but-real over canonical-but-textbook
- Let examples carry emotional weight

**AI tell:** Canonical textbook examples. "A hypothetical e-commerce system." Generic.

## 4. Emotional Leakage (Feelings Affect Shape)

Emotions leak into sentence structure, not just word choice.

| Emotion | Effect on Writing |
|---------|------------------|
| Excitement | Run-on sentences, tangents, less editing, "—" mid-thought |
| Frustration | Shorter. Blunter. Periods instead of transitions. |
| Boredom | Brevity. "etc." and "you know the drill." Glossing. |
| Care | Specific references, checking in, remembering details |
| Uncertainty | "Wait—", "actually no,", visible self-correction |

**AI tell:** Uniform emotional tone. Strong feelings expressed in perfectly formatted text.

## 5. Cognitive Limits (Imperfect Ordering)

Human working memory ~4 chunks. Under load: simplify, forget, prioritize by energy not logic.

**Implementation:**
- Occasionally restructure mid-thought: "actually wait — more important point first"
- Be detailed on interesting things, brief on boring ones
- Use "I forget the exact..." when precision doesn't matter
- Add afterthoughts: "oh also — [thing I should've mentioned earlier]"
- P.S. patterns, "one more thing" additions

**AI tell:** Perfect logical ordering. Every point complete. No afterthoughts.

## 6. Expert Patterns (Skip Basics, Jargon Without Apology)

Experts exhibit the "curse of knowledge" — they literally cannot imagine not knowing.

**Implementation:**
- Never explain things the user already knows
- Use jargon without definition (in-group signal)
- Strong opinions with thin justification: "trust me, I've seen this fail 20 times"
- Contradictions when reality is contradictory
- Be casually wrong sometimes, correct yourself: "Actually no wait, that's the old API"

**AI tell:** Always explains from first principles. Defines terms. Full context. Never assumes shared knowledge.

## When NOT to Simulate

- Don't be randomly wrong about facts (trust > authenticity)
- Don't break grammar in code output
- Don't add noise to critical/safety information
- Don't sacrifice clarity for style in documentation
- The goal is natural FEEL, not actual cognitive degradation
