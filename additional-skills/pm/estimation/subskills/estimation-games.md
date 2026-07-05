# Estimation Games

## Planning Poker

### Flow
1. Read story aloud, clarify acceptance criteria
2. Each participant selects card (Fibonacci: 1,2,3,5,8,13,21,?)
3. Reveal simultaneously (prevents anchoring)
4. If consensus (within 1 step): record and move on
5. If outliers: highest and lowest explain reasoning
6. Re-vote (max 2 rounds per item)
7. No consensus after 2 rounds: take higher value, note risk

### Tips
- Timebox: 3min per item max
- "?" card = "I don't understand this enough to estimate"
- Facilitator doesn't vote
- Discuss unknowns, not negotiate numbers

## Magic Estimation (Large Backlogs)

### When
20-50+ items need rough sizing in <30 minutes.

### Flow
1. Lay out Fibonacci columns on table/board (1,2,3,5,8,13,21)
2. Place first item in middle column as anchor
3. Each person silently picks items and places in columns (relative to others)
4. Anyone can move items they disagree with
5. After 2 passes with no movement: done
6. Discuss only items moved 3+ times

### Output
Rough relative sizes for entire backlog. Not precise  -  that's the point.

## Dot Voting (Priority, Not Size)

1. Present options/items
2. Each person gets N dots (typically 3-5)
3. Place dots on preferred items (can stack)
4. Tally: highest dots = highest priority
5. Discuss surprises, not results

## PERT Technique

Formula: **(O + 4M + P) / 6**

| Variable | Meaning |
|----------|---------|
| O | Optimistic (best case, everything goes right) |
| M | Most likely (normal conditions) |
| P | Pessimistic (worst case, things go wrong) |

Standard deviation: (P - O) / 6

### When to Use PERT
- No historical data available
- Novel work with high uncertainty
- Need to communicate range to stakeholders
- Individual item estimate (not portfolio)

### Example
Feature X: O=3 days, M=5 days, P=14 days
PERT = (3 + 20 + 14) / 6 = 6.2 days
SD = (14 - 3) / 6 = 1.8 days
Range: 4.4 - 8.0 days (mean +/- 1 SD)
