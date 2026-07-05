# How-To Guides

Task-oriented documentation -- assumes knowledge, focused on achieving a specific goal.

## When to Load

- Writing documentation for experienced users solving specific problems
- Distinguishing how-to guides from tutorials
- Structuring goal-oriented documentation
- Converting support tickets into reusable docs

## Key Concepts

**Task-oriented** -- Start with what the user wants to accomplish, not what the system does. Title format: "How to [achieve goal]" -- verb-first, action-focused.

**Assumes Knowledge** -- The reader already understands basics. No need to explain what an API key is or how to install Node. Link to prerequisites if needed, but do not inline them.

**Goal-focused** -- Every step moves toward the goal. No tangents, no history, no "why this works." If explanation is needed, put it in a callout or link to a concept page.

**Multiple Paths** -- Real tasks often have alternatives (CLI vs UI, quick vs thorough). Present the recommended path first, then alternatives in tabs or collapsible sections.

**Completeness** -- Unlike tutorials, how-to guides must cover edge cases. "If you are behind a proxy...", "For Windows users...", "If using version 1.x...". Address the common variants.

## Patterns

```markdown
# How to configure webhook retries

Configure automatic retries for failed webhook deliveries.

## Prerequisites
- Webhook endpoint already configured ([set up webhooks](/guides/webhooks))
- Admin permissions on the workspace

## Steps

1. Navigate to **Settings > Webhooks > [your endpoint]**

2. Under **Retry Policy**, select a strategy:

   | Strategy | Behavior |
   |----------|----------|
   | Exponential backoff | 1s, 2s, 4s, 8s, 16s (5 attempts) |
   | Fixed interval | Every 60s (10 attempts) |
   | None | No retries |

3. Set the **timeout** (how long to wait for a 2xx response):
   ```json
   { "retry_policy": "exponential", "timeout_ms": 5000, "max_attempts": 5 }
   ```

4. Click **Save** or use the API:
   ```bash
   curl -X PATCH https://api.example.com/webhooks/wh_123 \
     -H "Authorization: Bearer $TOKEN" \
     -d '{"retry_policy": "exponential", "max_attempts": 5}'
   ```

## Verify it works

Send a test event and intentionally return a 500 from your endpoint.
Check the delivery log to confirm retries occur at expected intervals.

## Troubleshooting
- **Retries not firing**: Ensure your endpoint returns a non-2xx status (timeouts also trigger retries)
- **Too many retries**: Check that your endpoint is not returning 2xx on partial failures
```

## Gotchas

- Mixing tutorial style ("Let's create...") into how-to guides creates confusion about audience
- Missing the "verify it works" step leaves users uncertain they completed the task
- Overly specific steps that only work for one OS/version without noting alternatives
- How-to guides that start with 5 paragraphs of context before the first actionable step
- Not linking to related how-to guides for adjacent tasks

## Verification

- Title is a verb phrase ("How to X") that matches what users would search for
- A reader with prerequisite knowledge can complete the task without additional research
- All common variants and edge cases are addressed (or explicitly noted as out of scope)
- Steps are numbered and each produces a verifiable result
- Guide has been tested end-to-end on the current version of the product
