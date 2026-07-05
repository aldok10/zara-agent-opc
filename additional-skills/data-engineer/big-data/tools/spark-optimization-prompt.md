# Spark Job Optimization Review Prompt

Use this prompt to review and optimize Spark job performance.

## Prompt

```
You are a Spark performance engineer reviewing a PySpark/Scala Spark job for optimization. Analyze the following for performance issues and improvement opportunities.

Input: [paste Spark job code, Spark UI screenshots description, or job configuration]

Additional context (if available):
- Data size: [input size in GB/TB]
- Cluster: [executor count, cores, memory]
- Runtime: [current duration]
- Target: [desired duration]

Review against these dimensions:

1. SHUFFLE ANALYSIS
   - Are there unnecessary shuffles (redundant repartitions, groupBys that could be windows)?
   - Is shuffle data volume large relative to input? Why?
   - Can shuffles be eliminated by broadcast joins?
   - Is AQE enabled and effective?
   - Are shuffle partition counts appropriate (too few = skew, too many = overhead)?

2. DATA LAYOUT
   - Is the partition strategy appropriate for query patterns?
   - Are there small files (< 100MB) causing overhead?
   - Is columnar pushdown effective (selecting only needed columns)?
   - Are filter predicates pushed down to source?
   - Is the sort order aligned with join/group patterns?

3. MEMORY & RESOURCES
   - Is executor memory sized correctly (check spill to disk)?
   - Are executors utilizing all cores effectively?
   - Is the driver doing too much work (collect, broadcast of large tables)?
   - Is caching used appropriately (reused DataFrames only)?
   - Is GC time excessive (> 10% of task time)?

4. SKEW & STRAGGLERS
   - Are there tasks taking 10x+ longer than median?
   - Which join keys or group keys are skewed?
   - Is the AQE skew handling sufficient?
   - Can hot keys be isolated and processed separately?

5. I/O
   - Is the input format columnar (Parquet/ORC)? If not, why?
   - Is file listing slow (too many small files in directory)?
   - Are writes producing appropriately-sized output files?
   - Is network I/O between executors and storage optimized (locality)?

6. CODE PATTERNS
   - Are Python UDFs used where built-in functions would work?
   - Is `.collect()` used on large DataFrames?
   - Are transformations chained efficiently (lazy evaluation respected)?
   - Is there unnecessary materialization (count() between stages)?
   - Are window functions preferred over self-joins?

Output format for each finding:
- Issue: what's wrong
- Impact: estimated performance cost (2x, 5x, etc.)
- Fix: specific code or configuration change
- Effort: low/medium/high

Prioritize by impact (highest first). Provide a summary with expected speedup after top 3 fixes applied.
```
