---
description: Play/control music (play, stop, next, radio, taste)
---

Control music. Parse arguments:

**Format**: `/music [action] [query]`

Examples:
- `/music` or `/music status` → what's playing?
- `/music play Sheila On 7` → play specific song
- `/music stop` → stop
- `/music next` → next track
- `/music pause` → pause/resume toggle
- `/music radio chill` → chill radio mode
- `/music radio upbeat` → upbeat radio
- `/music like` → like current song
- `/music dislike` → dislike, skip
- `/music taste` → show taste profile
- `/music history` → recent plays

**Parse rules:**
1. No args → action="status"
2. First word is action (play/stop/next/pause/radio/like/dislike/taste/history/status/queue)
3. Rest is the query

Use the `Orchestrator_play_music` tool to execute.

Arguments: $ARGUMENTS
