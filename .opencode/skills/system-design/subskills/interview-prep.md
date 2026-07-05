# Interview Prep: System Design Interview Framework

Deep-dive reference for structuring a 45–60 min system design interview.

## The Framework

**Phase 1  --  Clarify requirements (5 min).** Don't assume; ask:
- Who/how many users? DAU/MAU?
- QPS (read vs write ratio)?
- Data size / growth?
- Latency target? (p99)
- Consistency needs (strong vs eventual)?
- Which features are in scope? Nail functional + non-functional requirements first.

**Phase 2  --  API design + data model (10 min).**
- Define core endpoints, request/response shapes.
- Sketch schema + relationships.
- Identify **access patterns** (they drive DB and index choices).

**Phase 3  --  High-level architecture (15 min).**
- Draw the boxes: client, LB, services, cache, DB, queue.
- Walk the data flow end to end.
- Make **2–3 key decisions and explain WHY** (SQL vs NoSQL, sync vs async, etc.).

**Phase 4  --  Deep dive (15 min).**
- Interviewer picks a bottleneck. Scale it.
- Handle failure modes.
- Add monitoring/alerting. Discuss trade-offs.

## Back-of-Envelope Cheat Sheet

- 1 day = 86,400 s (**use ~100K** for easy math).
- 1M DAU × 10 req/user/day = **100 QPS avg, ~300 QPS peak**.
- 1 char = 1 byte. Tweet (280 chars) ≈ 280B. Image = 200KB–2MB. Video ≈ 5MB/min.
- SSD sequential read ≈ **500 MB/s**. Network (1 Gbps) ≈ **125 MB/s**. Memory ≈ **100 GB/s**.
- Single server: **1K–10K QPS** (depends on work). Redis: **100K–300K ops/s**. Kafka: **1M+ msgs/s**.
- SSD random read ~100μs, HDD ~10ms, mem access ~100ns, same-DC RTT ~0.5ms.

## What Interviewers Look For

- **Structured thinking**  --  don't jump straight to a solution.
- **Trade-off articulation**  --  not "we could use X" but "X gives Y at the cost of Z."
- **Operational awareness**  --  monitoring, what breaks, how you deploy.
- **Depth when probed**  --  can drill into any component.
- **Communication**  --  clear, collaborative, asks good questions.

## Common Questions

URL shortener · Twitter/news feed · chat system · rate limiter · notification system · search autocomplete/typeahead · video streaming · ride sharing · payment system · distributed cache · web crawler.

## Biggest Mistakes

- Jumping to a solution before gathering requirements.
- Not doing the capacity math.
- Over-engineering (multi-region, microservices for a toy).
- Forgetting failure modes.
- No monitoring/alerting discussion.
- Going silent  --  think out loud, it's collaborative.
