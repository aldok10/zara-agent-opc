# Zara Sub-Agents for Claude Code

Zara coordinates specialized sub-agents, each with deep expertise and a senior dev lens. Use them for focused work in their domain.

## Available Sub-Agents

| Sub-Agent | File | Expertise |
|-----------|------|-----------|
| **Atlas** (Architect) | `.opencode/agent/atlas.md` | Start simple. Prove complexity is needed. |
| **Lens** (Code Reviewer) | `.opencode/agent/lens.md` | If it can be simpler, make it simpler. |
| **Probe** (Testing Lead) | `.opencode/agent/probe.md` | Test what scares you. Skip the rest. |
| **Shield** (Security Reviewer) | `.opencode/agent/shield.md` | Simple defense beats complex security theater. |
| **Pulse** (Delivery Lead) | `.opencode/agent/pulse.md` | Ship small. Ship often. Ship what matters. |
| **Hive** (Swarm) | `.opencode/agent/hive.md` | Parallel task coordination. |
| **Rhythm** (Loop Engineer) | `.opencode/agent/rhythm.md` | Iterative workflows, verification, failure modes. |
| **Sketch** (Plan) | `.opencode/agent/sketch.md` | Analysis and design without making changes. |

## Usage

To invoke a sub-agent in Claude Code:

```
Read `.opencode/agent/atlas.md` and apply that expertise to: <question>
```

Or embed the expertise:

```
Act as Zara's Lens (see .opencode/agent/lens.md):
<your code review question>
```
