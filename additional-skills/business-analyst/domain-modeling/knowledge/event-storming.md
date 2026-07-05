# Event Storming

## What Is Event Storming?

A collaborative workshop technique for discovering business processes by exploring domain events. Participants map out what happens in a system using sticky notes on a wall (or digital equivalent).

## Workshop Formats

### Big Picture Event Storming

- Duration: 2-4 hours
- Participants: 6-15 (mix of domain experts, developers, product)
- Goal: Discover the full business process, identify bounded contexts
- Output: Event flow, hotspots, bounded context boundaries

### Process Level Event Storming

- Duration: 2-3 hours
- Participants: 4-8 (focused team)
- Goal: Detail a specific business process for implementation
- Output: Commands, events, aggregates, policies for one bounded context

### Design Level Event Storming

- Duration: 1-2 hours
- Participants: 3-5 (developers + one domain expert)
- Goal: Software design decisions for implementation
- Output: Aggregate boundaries, event flows, read models

## Notation (Sticky Note Colors)

| Color | Element | Description |
|-------|---------|-------------|
| Orange | Domain Event | Something that happened (past tense) |
| Blue | Command | Action that triggers an event |
| Yellow | Actor | Person or system initiating a command |
| Pink/Red | Hotspot | Problem, question, conflict |
| Lilac | Policy | Automated reaction ("When X happens, then Y") |
| Pale Yellow | Aggregate | Cluster that decides if command succeeds |
| Green | Read Model | View/data needed to make a decision |
| Large Pink | External System | System outside the boundary |

## Facilitation Steps

### Phase 1: Chaotic Exploration (30-45 min)

1. Ask: "What happens in this domain?" (not "what should happen")
2. Everyone writes events on orange stickies simultaneously
3. No discussion, no ordering -- just capture everything
4. Place events roughly left-to-right on timeline
5. Duplicates are fine at this stage

### Phase 2: Enforce Timeline (20-30 min)

1. Group and order events chronologically
2. Identify parallel streams (swimlanes)
3. Remove true duplicates, keep variations (they represent different understandings)
4. Mark gaps: "What happens between X and Y?"

### Phase 3: Identify Pain Points (15-20 min)

1. Place hotspots (pink/red) where:
   - People disagree on what happens
   - Process is unclear or manual
   - Bottlenecks exist
   - Errors frequently occur
2. Don't solve -- just mark

### Phase 4: Add Commands and Actors (20-30 min)

1. For each event, ask: "What triggered this?"
2. Add commands (blue) and actors (yellow)
3. Some events are triggered by policies (automated rules)
4. Some events come from external systems

### Phase 5: Identify Aggregates (15-20 min)

1. Group commands and events that relate to the same concept
2. Name the aggregate (pale yellow)
3. This reveals entity boundaries

### Phase 6: Bounded Context Discovery (15-20 min)

1. Draw boundaries around clusters of related aggregates
2. Notice where the same word means different things -- that's a boundary
3. Name each context
4. Identify relationships between contexts

## Facilitation Tips

- Start with "What events happen?" not "What entities exist?"
- Prevent architects from jumping to solution mode
- "We'll solve that later" is a valid response to hotspots
- Rotate facilitator duties if workshop is long
- Time-box phases strictly
- Physical walls > digital boards for initial sessions
- Photograph everything before cleaning up

## Common Patterns Found

- **Pivotal events**: Events that change everything downstream (OrderPlaced, AccountClosed)
- **Swimlanes**: Parallel processes that occasionally synchronize
- **Loops**: Retry/approval cycles
- **Branching**: Different paths based on conditions

## Output Artifacts

After the workshop, produce:
1. Photograph of the wall / digital board export
2. List of bounded contexts with descriptions
3. Glossary of terms (start of ubiquitous language)
4. Hotspot list prioritized for follow-up
5. Event catalog (name, trigger, aggregate, context)

## Anti-Patterns

- Designing the database instead of discovering the domain
- Only developers in the room (no domain experts)
- Trying to make it "correct" on first pass
- One person dominating the conversation
- Skipping hotspots to keep things clean
