# Leadership Patterns

## Situational Leadership (Hersey-Blanchard)

Match your leadership style to the person's development level on a specific task.
The same person can be D4 on backend work and D1 on infrastructure.

**D1 - Enthusiastic Beginner** -> S1 Directing
- High commitment, low competence
- Give clear instructions, check in frequently
- "Here's exactly what to do and how to do it"

**D2 - Disillusioned Learner** -> S2 Coaching
- Low commitment, some competence
- Explain the why, provide support, encourage
- "Here's why this matters, and here's how I'd approach it"

**D3 - Capable but Cautious** -> S3 Supporting
- Variable commitment, high competence
- Listen, facilitate, share decision-making
- "What do you think? I trust your judgment here"

**D4 - Self-Reliant Achiever** -> S4 Delegating
- High commitment, high competence
- Provide autonomy, stay available
- "You own this. Let me know if you need anything"

**Common mistakes:**
- Directing a D4 (micromanagement, they disengage)
- Delegating to a D1 (they fail, blame themselves)
- Not reassessing as people grow
- Applying one style to all situations

## Radical Candor

Two axes: Care Personally + Challenge Directly. Both must be present.

**Radical Candor** (high care + high challenge):
- "I'm telling you this because I want you to succeed"
- Specific, timely, in private for criticism, public for praise
- Example: "Your design doc missed the security section. Let's walk through
  what needs to be there before the review."

**Ruinous Empathy** (high care + low challenge):
- Avoid hard conversations to protect feelings
- The person never improves, eventually fails
- Example: "The design doc is... fine" (when it's not)

**Obnoxious Aggression** (low care + high challenge):
- Harsh criticism without human connection
- Creates fear, kills psychological safety
- Example: "This design doc is garbage. Did you even try?"

**Manipulative Insincerity** (low care + low challenge):
- Empty praise, political maneuvering
- No one grows, trust erodes
- Example: "Great job!" (said to everyone about everything)

**Practice:**
- Start with caring -- build the relationship first
- Ask for feedback on yourself before giving it to others
- Challenge incrementally -- start small and increase

## GROW Coaching Model

Use when helping someone think through a problem rather than giving answers.

**Goal** -- What do you want to achieve?
- "What would success look like?"
- "What's the outcome you're after?"
- Make it specific and measurable

**Reality** -- What's the current situation?
- "Where are you now relative to that goal?"
- "What have you already tried?"
- "What's getting in the way?"
- Listen without solving

**Options** -- What could you do?
- "What are your options?"
- "What else?" (ask this 3+ times)
- "If there were no constraints, what would you do?"
- Let them generate options first, then add yours

**Will** -- What will you do?
- "Which option will you pursue?"
- "What's your first step?"
- "When will you do it?"
- "How will I know it's done?"

**When to use GROW vs direct advice:**
- Use GROW when they have the capability but need clarity
- Give direct advice when they genuinely lack knowledge
- Mix both: "Here's what I know about X. Given that, what's your plan?"

## Giving Feedback: SBI Model

Situation, Behavior, Impact -- removes subjectivity from feedback.

**Situation** -- When and where. Anchors the conversation.
- "In yesterday's code review..."
- "During the sprint planning on Tuesday..."

**Behavior** -- Observable action, not interpretation.
- Good: "You interrupted Alex three times"
- Bad: "You were being dismissive"
- Good: "You shipped the fix within an hour of the report"
- Bad: "You're so fast"

**Impact** -- The effect of the behavior.
- "...which meant Alex couldn't finish explaining the tradeoffs"
- "...which meant the customer saw resolution before their next meeting"

**Delivery tips:**
- Give feedback within 48 hours (freshness matters)
- One piece of feedback per conversation
- Ask permission: "Can I share an observation?"
- Positive feedback is just as important as corrective
- Follow up: check if anything changed

## Building Psychological Safety

Teams with high psychological safety take more risks, learn faster, and
perform better (Google's Project Aristotle).

**Leader behaviors that build safety:**
- Admit your own mistakes publicly
- Ask questions you don't know the answer to
- Thank people for raising problems (not just solutions)
- Respond to failure with curiosity, not blame
- Make it safe to say "I don't know"

**Structural supports:**
- Blameless postmortems (focus on systems, not people)
- Anonymous feedback channels
- Explicit norm-setting ("In this team, we...")
- Celebrate learning from failure, not just success

**Signals that safety is low:**
- Silence in meetings (nobody asks questions)
- Problems surface late (people hide bad news)
- Same people always speak
- "That's above my pay grade" (deflection)
- Low participation in retros

**Repair patterns:**
- Acknowledge the breach: "I reacted poorly to that bug report"
- State the norm: "I want us to surface problems early"
- Model the behavior: share your own mistakes first
- Follow through: visibly change based on feedback
