---
description: Architecture decision
agent: atlas
---
$ARGUMENTS. Pre: `Orchestrator_knowledge(action:"search", query:"$ARGUMENTS")` + `Orchestrator_memory(action:"recall", query:"$ARGUMENTS")`. Analyze: options > tradeoffs > recommendation > failure modes. Post: `Orchestrator_memory(action:"learn", key:"decision.<slug>", value:"<choice + why>", type:"decision", source:"user_explicit")`.
