---
type: tool
title: "Retro Format Selector Prompt"
---

# Retro Format Selector Prompt

## Template

```
Recommend a retrospective format given:

Input:
- Team size: [number]
- Setting: [remote / hybrid / in-person]
- Sprint events: [normal / post-incident / release / reorg / low morale]
- Previous format used: [format name]
- Team energy: [high / neutral / low / fatigued]
- Time available: [minutes]

Selection criteria:
1. Never repeat same format 2x in a row (variety prevents staleness)
2. Match format to sprint events (incident → Timeline, low morale → Mad/Sad/Glad)
3. Remote teams: prefer async-first or structured-turn formats
4. Large teams (>10): World Cafe or Silent Writing Async
5. Low energy: short formats (Happiness Radar, 30-45min max)
6. AI-heavy sprint: AI Impact Retro

Output:
- Recommended format + why
- Agenda with timeboxes per section
- Facilitator prep notes (materials, board setup, prompts)
- One backup format if team rejects primary
```
