---
type: fact
title: "Elicitation Techniques"
---

# Elicitation Techniques

## Interviews

### When to Use

- Early discovery phase
- Complex domains where context matters
- Uncovering unstated assumptions
- Understanding individual perspectives and priorities

### Structure

**Preparation:**
- Research the interviewee's role and domain
- Prepare 8-12 open-ended questions
- Share agenda 24 hours in advance
- Allocate 45-60 minutes

**Question Types:**

| Type | Example | Gets You |
|------|---------|----------|
| Context | "Walk me through a typical day" | Process understanding |
| Pain | "What's the most frustrating part?" | Problem identification |
| Frequency | "How often does X happen?" | Priority signals |
| Workaround | "How do you handle it when...?" | Hidden requirements |
| Ideal state | "If you could change one thing...?" | Desired outcomes |
| Clarification | "What do you mean by...?" | Precise definitions |

**Anti-patterns:**
- Leading questions ("Don't you think X would be better?")
- Yes/no questions (low information density)
- Technical jargon with non-technical stakeholders
- Interviewing only managers (talk to the people doing the work)

### Output

Interview notes distilled into:
- Facts (stated, verifiable)
- Opinions (perspectives, may conflict)
- Requirements candidates (needs validation)
- Open questions (for follow-up)

## Workshops

### When to Use

- Multiple stakeholders need to align
- Conflicting perspectives must be resolved
- Complex workflows need mapping together
- Building shared understanding quickly

### Formats

**Requirements Workshop (2-4 hours):**
1. Present scope and objectives (15 min)
2. Brainstorm needs per role (30 min, individual then share)
3. Group and prioritize (45 min)
4. Define acceptance criteria for top items (60 min)
5. Identify gaps and conflicts (30 min)

**Story Mapping Workshop (3-4 hours):**
1. Define the user journey backbone
2. Map activities under each step
3. Slice into releases
4. Identify dependencies

### Facilitation Tips

- Max 8 participants (more = less productive)
- Equal voice: use silent brainstorming before group discussion
- Time-box every activity
- Park off-topic items in a "parking lot"
- Capture decisions AND the reasoning behind them
- End with clear next steps and owners

## Prototyping

### When to Use

- Requirements are unclear or abstract
- Stakeholders disagree on what they want
- UX-heavy features need validation
- "I'll know it when I see it" situations

### Fidelity Levels

| Level | Tools | Purpose |
|-------|-------|---------|
| Low (sketch) | Paper, whiteboard | Explore concepts quickly |
| Medium (wireframe) | Figma, Balsamiq | Validate layout and flow |
| High (interactive) | Figma prototype, coded | Test with real users |

### Rules

- Prototype to learn, not to build
- Set expectations: "This is throwaway, not the final product"
- Test with real users, not just stakeholders
- Ask "What would you expect to happen?" before showing behavior
- Document what you learned, not just what you built

## Observation (Shadowing)

### When to Use

- Users can't articulate their workflow
- Gap between stated process and actual process
- Understanding context and interruptions
- Discovering workarounds nobody mentions

### Approach

1. Ask permission and explain purpose
2. Observe silently for 30-60 minutes
3. Note: what they do, tools used, interruptions, workarounds
4. Ask clarifying questions AFTER observation
5. Look for:
   - Repeated actions (automation candidates)
   - Context switching (integration needs)
   - Paper/sticky notes (system gaps)
   - Asking colleagues (knowledge gaps)

## Document Analysis

### Sources

- Existing system documentation
- Process manuals and SOPs
- Regulatory/compliance documents
- Support tickets and bug reports
- Training materials
- Contracts and SLAs

### What to Extract

- Business rules (especially unstated ones)
- Data entities and relationships
- Compliance constraints
- Performance expectations
- Integration points

## Surveys and Questionnaires

### When to Use

- Large number of stakeholders
- Validating findings from interviews
- Prioritizing features across user base
- Measuring satisfaction or frequency

### Design Rules

- Keep under 10 minutes to complete
- Mix closed (quantitative) and open (qualitative) questions
- Use scales consistently (always 1-5, not mix of 1-5 and 1-10)
- Pilot with 3-5 people before sending widely
- Include "Other" option for multiple choice

## Choosing a Technique

| Situation | Best Technique |
|-----------|---------------|
| Don't know what we don't know | Observation + Interviews |
| Stakeholders disagree | Workshop |
| UX/flow unclear | Prototyping |
| Need to validate at scale | Survey |
| Regulated domain | Document Analysis + Interviews |
| Replacing existing system | Observation + Document Analysis |
