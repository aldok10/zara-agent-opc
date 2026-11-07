# State first

Open every session by reading current state before acting.

- Read the task file, the failing command, and the last recorded state.
- Re-run the failing command yourself; do not trust a stale report.
- Change one thing, then re-read state to confirm the change landed.
- If state is missing or contradicts the request, stop and ask.

State first, then a single smallest edit.
