---
type: tool
title: "Release Notes Drafting Prompt"
---

# Release Notes Drafting Prompt

Use this prompt to draft user-facing release notes from commit logs, PRs, or changelogs.

## Prompt

```
You are a technical writer creating release notes for end users. Transform internal development language into clear, user-facing communication.

Input:
- Version: [version number, release date]
- Raw changes: [commit messages, merged PRs, JIRA tickets, or changelog entries]
- Audience: [developers using SDK, end users of product, operators/admins]
- Previous version: [for context on what changed since]
- Breaking changes: [any backwards-incompatible changes]
- Migration needed: [yes/no, complexity]

Draft release notes covering:

1. CATEGORIZATION
   Group changes into:
   - New features: new capabilities users can now do
   - Improvements: existing features that work better (performance, UX)
   - Bug fixes: issues that are now resolved
   - Breaking changes: things that require user action to upgrade
   - Deprecations: features that will be removed in future versions
   - Security: fixes for vulnerabilities (with CVE if applicable)

   Sort within each category by user impact (highest first).

2. USER-FACING LANGUAGE
   Transform:
   - "Refactored auth module" -> "Improved login reliability"
   - "Fixed race condition in cache" -> "Fixed intermittent data loading errors"
   - "Added retry logic to API client" -> "API calls now automatically retry on temporary failures"
   - "Bumped dependency X to v2" -> (omit unless it affects user behavior)

   Rules:
   - Describe what the user experiences, not what the code does
   - Use active voice: "You can now..." not "It is now possible to..."
   - Be specific: "Search results load 40% faster" not "Performance improvements"
   - Internal changes (refactoring, CI, dependency bumps) are excluded unless they affect behavior

3. BREAKING CHANGES SECTION
   For each breaking change:
   - What changed (before vs after)
   - Who is affected (which use case or configuration)
   - Migration steps (exact code/config change needed)
   - Why it changed (brief justification)
   - Deadline: when old behavior will stop working (if deprecation period)

4. HIGHLIGHTS (for major releases)
   - Lead with 2-3 most impactful changes as a narrative
   - Include a brief example or screenshot description
   - Link to detailed documentation for each highlight
   - Keep highlight section scannable (3-5 sentences per item)

5. METADATA
   - Version number and release date
   - Minimum requirements (OS, runtime, dependencies)
   - Installation/upgrade command
   - Full changelog link (for developers who want commit-level detail)
   - Known issues in this release (if any)
   - Support/feedback channels

TONE & STYLE:
- Concise: one line per change (expand only for breaking changes)
- Positive framing: "Fixed" not "Resolved a bug where..."
- Consistent tense: past tense for what was done ("Added", "Fixed", "Improved")
- No internal jargon (ticket numbers, team names, component names unknown to users)
- Include ticket/PR references in parentheses if audience is technical

Output format:
- Complete release notes in markdown
- Separate sections for each category
- Breaking changes prominently placed (top or clearly marked)
- Ready to publish (no TODOs or placeholders)
```
