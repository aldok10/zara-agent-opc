# OST Example: New User Activation

## Desired Outcome
Increase new user activation from 40% to 60% within 90 days.
Activation = user completes core action within first 7 days.

## Opportunities (from interviews + data)

### 1. Users don't understand value prop in first 2 minutes
Evidence: [L4-behavioral] 55% bounce from onboarding step 2. 8/12 interviews cited confusion.
Priority: H (Freq:H, Int:H, Breadth:H)

### 2. Setup requires too many steps before first value
Evidence: [L4-behavioral] Median time-to-value: 12 min. Competitors: 3 min.
Priority: H (Freq:H, Int:M, Breadth:H)

### 3. Users lack context on what to do after signup
Evidence: [L3-survey] 40% selected "didn't know what to do next" in churn survey.
Priority: M (Freq:M, Int:H, Breadth:M)

## Solutions + Experiments

### Opportunity 1: Value prop confusion

**Solution 1a**: Interactive demo before signup
- Assumption: Users who see product in action will activate more
- Experiment: Fake door — "Try it now" on landing page. Success: >5% click-through (n=1000)

**Solution 1b**: Personalized onboarding by use case
- Assumption: Tailored paths reduce confusion
- Experiment: Wizard of Oz — manually route 50 users to tailored paths. Success: activation >55%

### Opportunity 2: Too many steps

**Solution 2a**: Skip setup, pre-populate with sample data
- Assumption: Seeing populated product drives exploration
- Experiment: A/B test — sample data vs empty state. Success: +10pp activation (n=500/arm)

**Solution 2b**: Progressive setup (do minimum, prompt rest later)
- Assumption: Reducing upfront friction increases completion
- Experiment: Prototype test — 8 users attempt reduced flow. Success: >80% task completion
