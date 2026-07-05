# Developer Onboarding

Getting-started guides, quickstarts, and optimizing time-to-first-call for developer platforms.

## When to Load

- Writing quickstart documentation
- Reducing time-to-first-success for new developers
- Designing the first-run experience
- Measuring onboarding effectiveness

## Key Concepts

**Time-to-First-Call (TTFC)** -- The time from landing on docs to successfully making the first API call. Primary metric for onboarding quality. Target: under 5 minutes for simple APIs.

**Quickstart** -- Minimal viable path to success. One page, one use case, copy-paste commands that work. No optional steps, no configuration choices, no explanations of why.

**Prerequisites** -- Clearly state what the user needs before starting. Account, API key, runtime versions, tools. Link to how to get each one. Do not bury prerequisites mid-flow.

**Interactive Elements** -- Embedded API explorers, runnable code blocks, pre-filled curl commands with the user's actual API key (from dashboard context). Reduce friction.

**Success Moment** -- Define what "done" looks like. Show expected output. Make it visual and satisfying. "You should see: `{ "status": "ok", "user": "..." }`"

## Patterns

```markdown
# Quickstart

Get your first API response in under 3 minutes.

## Prerequisites
- An Example account ([sign up free](https://example.com/signup))
- Your API key (find it in [Dashboard > Settings](https://example.com/settings))

## 1. Install the SDK

```bash
npm install @example/sdk
```

## 2. Make your first request

```javascript
import { Example } from '@example/sdk';

const client = new Example({ apiKey: 'YOUR_API_KEY' });
const user = await client.users.get('me');
console.log(user);
```

## 3. Verify it works

You should see:
```json
{ "id": "usr_abc123", "email": "you@example.com", "plan": "free" }
```

## Next steps
- [Add authentication to your app](/guides/auth)
- [Explore the API reference](/reference/api)
```

## Gotchas

- Quickstarts that require environment setup (Docker, databases) before the first success kill momentum
- "Hello World" examples that do not connect to a real account feel fake and teach nothing
- Multiple language tabs at every step create decision paralysis -- pick one default, link to others
- Expired or invalid sample API keys in docs produce cryptic errors for new users
- Testing quickstarts only on fresh machines catches missing implicit dependencies

## Verification

- Run the quickstart from scratch on a clean machine -- does it work as written?
- Measure TTFC: time from page load to successful response
- Every code block is copy-pasteable (no smart quotes, no truncation, no "..." placeholders)
- Error states have clear resolution: "If you see X, check Y"
- Analytics show completion rate of each step (identify drop-off points)
