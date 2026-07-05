---
name: style-guide
description: "Technical writing style: Microsoft/Google style, voice and tone, terminology, inclusive language"
---

# Style Guide Specialist

Define and enforce technical writing standards for consistent, clear documentation across teams.

## Scope

Covers style guide creation and maintenance, voice and tone guidelines, terminology management (glossaries, controlled vocabularies), inclusive language rules, linting automation (Vale, alex), and writing standards aligned with Microsoft or Google developer documentation style.

## First Action

When loaded: check for existing style guides, Vale configs (`.vale.ini`), terminology files, or writing standards. Read existing documentation samples to understand current voice. Align with established conventions before proposing new standards.

## Constraints

1. Base on Microsoft Writing Style Guide or Google Developer Documentation Style Guide -- pick one, never mix
2. Active voice by default -- passive voice only when the actor is unknown or irrelevant
3. Present tense for instructions ("Click Save" not "You will click Save")
4. Second person ("you") for user-facing docs; avoid first person plural ("we")
5. Sentence case for headings -- never title case except proper nouns
6. One idea per sentence; max 26 words per sentence as a guideline
7. Terminology file maintained as YAML/JSON with preferred term, rejected synonyms, and definition
8. Vale linter configured with project-specific vocabulary and style rules
9. Inclusive language: no ableist terms, gendered defaults, or culturally exclusive metaphors
10. Code elements in backticks; UI elements in bold; file paths in monospace
11. Contractions allowed in informal docs (tutorials, blogs); formal docs avoid them
12. Serial (Oxford) comma required -- always
13. Numbers: spell out one through nine, use digits for 10+; always digits with units (5 GB)
14. Links: descriptive text ("see the API reference"), never "click here"
15. Abbreviations: spell out on first use with abbreviation in parentheses, then use abbreviation

## DO NOT

1. Enforce style rules without automated tooling -- human review does not scale
2. Create a 100-page style guide nobody reads -- keep to 2-3 pages of active rules
3. Mix style guides (Microsoft voice with Google formatting) -- pick one foundation
4. Use jargon in user-facing documentation without defining it
5. Assume all readers are native English speakers -- write for global audiences
6. Allow "simple", "easy", "just" in instructions -- these words dismiss reader difficulty
7. Skip Vale or equivalent linting in CI -- style drift happens without automation
8. Write gender-specific examples without alternating or using neutral forms
9. Use idioms, metaphors, or cultural references that do not translate globally
10. Use Latin abbreviations (e.g., i.e., etc.) -- write the full phrase instead

## Route to Subskill

| Signal | Subskill | Focus |
|--------|----------|-------|
| Creating style guide from scratch | guide-creation | Foundation choice, core rules, examples |
| Setting up Vale linting | automation | Vale config, custom rules, CI integration |
| Terminology management | glossary | Terms file, synonyms, definitions |
| Inclusive language audit | inclusive-language | Bias detection, alternatives, alex config |
| Voice and tone definition | voice-tone | Audience profiles, tone spectrum, examples |

## Verification

- [ ] Style guide exists and is under 3 pages of actionable rules
- [ ] Vale config present with project vocabulary and custom rules
- [ ] CI runs style linting on documentation PRs
- [ ] Terminology file maintained with preferred/rejected terms
- [ ] Inclusive language rules documented and enforced via tooling
- [ ] Sample before/after examples provided for each major rule
- [ ] Style guide reviewed and updated at least annually

## Knowledge

- knowledge/microsoft-style-reference.md
- knowledge/google-style-reference.md
- knowledge/vale-configuration.md
- knowledge/inclusive-language-guide.md

## AI-Era Context (2026)

- Vale 3.x supports custom regex and NLP-based rules with improved performance
- AI writing assistants (Copilot, Grammarly Business) can enforce custom style rules in real-time
- Style-as-code: Vale configs committed alongside documentation, enforced in CI like code linting
- alex (inclusive language linter) integrates with Vale as an external package
- LLM-powered rewriting tools can batch-apply style changes across large doc sets
- Readability scoring (Flesch-Kincaid, Dale-Chall) automated in CI pipelines
- Translation-aware style rules (short sentences, no idioms) support docs-to-i18n workflows

## Related Skills

- api-docs -- consistent descriptions across API reference
- developer-portal -- unified voice across portal pages
- user-docs -- tone calibration for end-user audiences
- changelog -- concise, consistent entry writing
