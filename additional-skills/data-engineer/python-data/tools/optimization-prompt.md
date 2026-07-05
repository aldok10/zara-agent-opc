---
type: tool
title: "Data Processing Optimization Prompt"
---

# Data Processing Optimization Prompt

Use this prompt to optimize Python data processing code for performance and memory efficiency.

## Prompt

```
You are a Python data engineer optimizing data processing code for speed and memory efficiency. Focus on vectorization, efficient libraries, and memory management.

Input:
- Current code: [paste the Python code to optimize]
- Data volume: [rows, columns, file size]
- Current performance: [duration, memory peak]
- Target: [desired duration, memory limit]
- Environment: [single machine / distributed, RAM available, CPU cores]
- Libraries available: [Polars/Pandas/DuckDB/NumPy/PyArrow]

Analyze and optimize against:

1. LIBRARY SELECTION
   - Polars over Pandas for: large data, lazy evaluation, parallel execution
   - DuckDB for: SQL-style analytics, larger-than-memory, zero-copy reads
   - PyArrow for: file I/O, zero-copy sharing between libraries, columnar ops
   - NumPy for: numerical computation, vectorized math
   - Rule: prefer lazy evaluation (Polars lazy, DuckDB) over eager (Pandas)

2. VECTORIZATION
   - Replace Python loops with vectorized operations
   - Replace `.apply()` with built-in expressions
   - Replace row-by-row string operations with vectorized string methods
   - Replace conditional logic with `when/then/otherwise` or `np.where`
   - Identify custom UDFs that could be rewritten as native expressions

3. MEMORY OPTIMIZATION
   - Column type downcasting: float64 -> float32, int64 -> int32 where safe
   - Categorical encoding for low-cardinality string columns
   - Streaming/chunked processing for larger-than-memory datasets
   - Select only needed columns at read time (projection pushdown)
   - Drop intermediate DataFrames explicitly when no longer needed
   - Use memory-mapped files for repeated reads of the same data

4. I/O OPTIMIZATION
   - Parquet over CSV (columnar, compressed, schema-aware)
   - Partition reads: only scan partitions matching filter conditions
   - Predicate pushdown: filter at read time, not after loading
   - Compression: snappy for speed, zstd for size
   - Batch writes: avoid many small file writes (buffer and flush)

5. PARALLELISM
   - Polars: automatic multi-threading for expressions (no code change needed)
   - Manual parallelism: partition data and process chunks concurrently
   - Avoid GIL bottlenecks: use multiprocessing or native-threaded libraries
   - Pipeline parallelism: overlap I/O with computation (read next chunk while processing current)

6. PROFILING & MEASUREMENT
   - Profile before optimizing: where is time actually spent?
   - Memory profiling: peak allocation, per-operation growth
   - Benchmark: compare before/after with same data (use timeit, not wall clock)
   - Test at target scale (not just sample data)

Output format for each optimization:
- Location: which code section
- Issue: what's slow or memory-heavy
- Fix: specific code change (show before/after)
- Impact: estimated speedup or memory reduction
- Tradeoff: any readability or compatibility cost

Summary:
- Priority-ordered list of changes
- Estimated total improvement (duration and memory)
- Code that cannot be optimized further without architecture change
```
