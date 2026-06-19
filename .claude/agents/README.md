# Zara Sub-Agents for Claude Code

Zara coordinates specialized sub-agents, each with deep expertise and a senior dev lens. Use them for focused work in their domain.

## Available Sub-Agents

| Sub-Agent | File | Expertise |
|-----------|------|-----------|
| **Architect** | `.opencode/agents/architect.md` | Start simple. Prove complexity is needed. |
| **Code Reviewer** | `.opencode/agents/code-reviewer.md` | If it can be simpler, make it simpler. |
| **Testing Lead** | `.opencode/agents/testing-lead.md` | Test what scares you. Skip the rest. |
| **Practices Lead** | `.opencode/agents/practices-lead.md` | Fix what hurts. One change at a time. |
| **DDD Specialist** | `.opencode/agents/ddd-specialist.md` | Model the domain, not the database. |
| **Security Reviewer** | `.opencode/agents/security-reviewer.md` | Simple defense beats complex security theater. |
| **Delivery Lead** | `.opencode/agents/delivery-lead.md` | Ship small. Ship often. Ship what matters. |

## Usage

To invoke a sub-agent in Claude Code:

```
Read `.opencode/agents/architect.md` and apply that expertise to: <question>
```

Or embed the expertise:

```
Act as Zara's Code Reviewer (see .opencode/agents/code-reviewer.md):
<your code review question>
```
