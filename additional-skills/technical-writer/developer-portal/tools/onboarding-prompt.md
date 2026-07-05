---
type: tool
title: "Developer Onboarding Guide Creation Prompt"
---

# Developer Onboarding Guide Creation Prompt

Use this prompt to create a quickstart guide that takes a developer from zero to first successful API call.

## Prompt

```
You are a technical writer creating a developer onboarding guide. Get the developer from signup to first successful interaction in the minimum number of steps.

Input:
- Product: [API/SDK/platform name]
- Developer audience: [skill level, typical background]
- Prerequisites: [accounts, tools, languages needed]
- Authentication: [API key, OAuth, token-based]
- Primary use case: [what most developers want to do first]
- Time-to-first-success target: [minutes to first working call]

Create the onboarding guide covering:

1. QUICKSTART STRUCTURE
   - Title: "Get started with [Product] in 5 minutes"
   - Prerequisites checklist (what they need before starting)
   - Steps numbered 1-N (target: under 7 steps to first success)
   - Each step: action + expected result
   - Final step: verify it worked (see the output, check the dashboard)

2. AUTHENTICATION SETUP
   - Where to get credentials (dashboard URL, signup flow)
   - How to store credentials safely (env vars, not hardcoded)
   - How to pass credentials (header, query param, SDK config)
   - Common auth errors and what they mean
   - Token lifecycle: expiration, refresh, rotation

3. FIRST API CALL
   - Choose the simplest endpoint that returns useful data
   - Show the complete request (no assumptions about prior knowledge)
   - Show the complete response with annotation
   - Use realistic sample data (not lorem ipsum)
   - Provide in at least 2 formats: cURL + one SDK language
   - "If you see [this output], you're set up correctly"

4. COMMON NEXT STEPS
   After the first call succeeds, guide toward:
   - The primary use case (create/read/modify their first resource)
   - Setting up webhooks or callbacks (if event-driven)
   - Error handling patterns
   - Links to full reference docs for deeper exploration
   - "What most developers do next" section (data-driven if possible)

5. TROUBLESHOOTING
   - Top 5 errors developers hit during onboarding
   - For each: symptom, cause, fix (one sentence each)
   - "Still stuck?" link to support/community
   - Environment-specific issues (Windows vs Mac vs Linux)
   - Version compatibility notes

6. ENVIRONMENT SETUP
   - SDK installation (package manager command, exact version)
   - Language/runtime version requirements
   - IDE/editor recommendations (optional, brief)
   - Environment variable configuration
   - Verification command: "Run this to confirm setup is correct"

WRITING RULES:
- Every step must be a concrete action (no "familiarize yourself with...")
- Show the expected output after each step (developer knows they're on track)
- Use the developer's perspective: "You will see..." not "The system returns..."
- No forward references (don't mention concepts explained later)
- Code blocks must be complete and runnable (no ... or pseudo-code)
- Include copy buttons / one-line commands where possible
- Total guide length: 1-2 printed pages maximum

Output format:
- Complete quickstart guide in markdown
- Prerequisites section
- Numbered steps with code blocks
- Verification step at the end
- Next steps section with 3-4 links
- Troubleshooting FAQ (5 items)
```
