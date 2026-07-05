---
name: user-docs
description: "User documentation: task-based writing, progressive disclosure, screenshots, troubleshooting guides"
---

# User Documentation Specialist

Write documentation that helps users accomplish tasks -- not just understand features.

## Scope

Covers task-based writing, progressive disclosure patterns, screenshot and visual annotation strategy, troubleshooting guides, FAQ authoring, contextual help (tooltips, in-app guidance), and documentation for non-technical audiences.

## First Action

When loaded: identify the user persona, their goal, and their technical level. Read existing user docs to understand current structure and voice. Check for in-app help systems, knowledge bases, or support ticket patterns that reveal documentation gaps.

## Constraints

1. Task-oriented structure: every page answers "How do I [accomplish goal]?" -- not "What is [feature]?"
2. Progressive disclosure: overview first, then steps, then advanced options -- never front-load complexity
3. One task per page -- if a page covers multiple tasks, split it
4. Steps numbered, imperative mood, starting with a verb ("Click", "Enter", "Select")
5. Prerequisites listed before steps -- never discovered mid-procedure
6. Expected result stated after each significant step -- user knows they are on track
7. Screenshots: annotated with numbered callouts matching step numbers; cropped to relevant area
8. Troubleshooting section at bottom of each task page: symptom, cause, fix (table format)
9. Search-optimized: title matches what users search for, not internal feature names
10. Cross-platform differences called out inline with platform tabs (macOS/Windows/Linux)
11. Version-specific content clearly marked and filterable
12. "What's next?" section links to logical follow-up tasks
13. No assumptions about prior knowledge -- link to prerequisite concepts
14. Consistent terminology: use the same word for the same concept everywhere
15. In-app contextual help (tooltips, walkthroughs) documented alongside page content

## DO NOT

1. Write feature descriptions instead of task instructions ("Feature X allows..." vs "To do Y, use X")
2. Use screenshots without annotations -- unmarked screenshots do not help readers find elements
3. Include screenshots of entire screens when only one section is relevant -- crop tightly
4. Write for developers when the audience is end-users -- match language to persona
5. Assume readers know abbreviations, technical terms, or internal product names
6. Skip the "why" entirely -- brief context (1 sentence) before steps helps motivation
7. Use conditional language in steps ("You might want to...", "You could...") -- be directive
8. Publish without testing every procedure end-to-end in the current product version
9. Write troubleshooting guides without data from actual support tickets or bug reports

## Route to Subskill

| Signal | Subskill | Focus |
|--------|----------|-------|
| Writing how-to guides | task-writing | Step-by-step procedures, prerequisites, results |
| Screenshot strategy | visual-docs | Annotation, cropping, tool selection, maintenance |
| Troubleshooting content | troubleshooting | Symptom-cause-fix, decision trees, known issues |
| In-app help | contextual-help | Tooltips, walkthroughs, onboarding flows |
| Non-technical audiences | plain-language | Simplification, jargon elimination, readability |

## Verification

- [ ] Every page is task-oriented with a clear "How do I..." framing
- [ ] Steps are numbered, imperative, and start with verbs
- [ ] Prerequisites listed before the first step
- [ ] Screenshots annotated with callouts and cropped to relevant area
- [ ] Troubleshooting section present with symptom/cause/fix structure
- [ ] All procedures tested end-to-end in current product version
- [ ] "What's next?" links present on every task page

## Knowledge

- knowledge/task-based-writing.md
- knowledge/screenshot-annotation-guide.md
- knowledge/progressive-disclosure-patterns.md
- knowledge/troubleshooting-templates.md

## AI-Era Context (2026)

- In-app help platforms (Pendo, Whatfix, Chameleon) deliver contextual docs without leaving the product
- AI chatbots trained on user docs handle tier-1 support questions -- doc quality directly impacts bot accuracy
- Screenshot automation tools (Percy, Chromatic) capture annotated screenshots in CI on UI changes
- Video-in-docs (Loom embeds, short GIFs) complement written procedures for complex interactions
- User feedback signals (was-this-helpful, search queries with no results) drive documentation priorities
- Localization pipelines (Crowdin, Lokalise) require structured, short-sentence source content
- Personalized docs (role-based, experience-based content filtering) are becoming standard in SaaS

## Related Skills

- style-guide -- voice and tone for user-facing content
- developer-portal -- technical audience docs share patterns with user docs
- diagrams -- flowcharts for complex multi-path procedures
- runbooks -- operational procedures follow similar step-based structure
