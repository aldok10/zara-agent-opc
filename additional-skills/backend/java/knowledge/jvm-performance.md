---
type: fact
title: "JVM performance: GC selection, JFR, async profiler, JIT"
---

# JVM Performance

## Garbage Collector Selection

| GC | Best For | Pause Target | Throughput | Memory Overhead |
|----|----------|-------------|------------|-----------------|
| G1 (default) | General purpose, balanced | 200ms (configurable) | High | Moderate |
| ZGC | Low latency, large heaps | < 1ms | Good | ~15% extra |
| Shenandoah | Low latency (RedHat) | < 10ms | Good | ~15% extra |
| Serial | Small heaps, containers | N/A (STW) | Low | Minimal |
| Parallel | Batch processing, throughput | N/A (STW) | Highest | Low |

### Recommendations

```bash
# Web services (Spring Boot, API servers)  -  low latency
java -XX:+UseZGC -XX:+ZGenerational -Xmx2g -jar app.jar

# General purpose (default is fine for most)
java -XX:+UseG1GC -XX:MaxGCPauseMillis=100 -Xmx4g -jar app.jar

# Container with limited memory (< 512MB)
java -XX:+UseSerialGC -Xmx256m -jar app.jar

# Batch/data processing  -  max throughput
java -XX:+UseParallelGC -Xmx8g -jar app.jar
```

## Container-Aware JVM Settings

```bash
# Let JVM detect container limits (default since Java 10)
-XX:+UseContainerSupport

# Set heap as percentage of container memory
-XX:MaxRAMPercentage=75.0    # 75% of container limit
-XX:InitialRAMPercentage=50.0

# For small containers (< 512MB)
-XX:MaxRAMPercentage=50.0    # Leave room for native memory, threads
```

## JFR (Java Flight Recorder)

Zero-overhead (< 1%) production profiling built into the JVM.

```bash
# Start recording with application
java -XX:StartFlightRecording=duration=60s,filename=app.jfr -jar app.jar

# Continuous recording (ring buffer)
java -XX:StartFlightRecording=maxsize=250m,maxage=5m,disk=true -jar app.jar

# Attach to running JVM
jcmd <pid> JFR.start duration=30s filename=recording.jfr
jcmd <pid> JFR.dump filename=dump.jfr
jcmd <pid> JFR.stop
```

Key events to monitor:
- `jdk.GCPause`  -  GC pause duration
- `jdk.CPULoad`  -  System/process CPU
- `jdk.ThreadPark`  -  Thread contention
- `jdk.VirtualThreadPinned`  -  Virtual thread pinning
- `jdk.SocketRead` / `jdk.SocketWrite`  -  I/O latency
- `jdk.ObjectAllocationSample`  -  Allocation hot spots

## Async Profiler

Low-overhead sampling profiler for CPU, allocation, and lock profiling.

```bash
# CPU profiling
./profiler.sh -d 30 -f cpu.html <pid>

# Allocation profiling (where objects are created)
./profiler.sh -e alloc -d 30 -f alloc.html <pid>

# Lock contention
./profiler.sh -e lock -d 30 -f lock.html <pid>

# Wall-clock (includes blocked/waiting time)
./profiler.sh -e wall -d 30 -f wall.html <pid>
```

Output: flame graphs (HTML) showing hot paths.

## JIT Compilation

The JVM compiles hot methods from bytecode to native code at runtime.

```bash
# Log JIT compilation
-XX:+PrintCompilation

# Disable tiered compilation (for benchmarking  -  forces C2 only)
-XX:-TieredCompilation

# Max code cache (increase for large apps)
-XX:ReservedCodeCacheSize=512m
```

### Warm-up

JIT needs ~10-30 seconds to compile hot paths. First requests are slow.

Strategies:
1. **Load-shedding during warm-up**  -  readiness probe after warm-up period.
2. **CDS/AppCDS**  -  Class Data Sharing reduces startup time.
3. **GraalVM native**  -  eliminates warm-up entirely (AOT compiled).

## Application Class-Data Sharing (AppCDS)

```bash
# Step 1: Generate class list
java -Xshare:off -XX:DumpLoadedClassList=classes.lst -jar app.jar

# Step 2: Create shared archive
java -Xshare:dump -XX:SharedClassListFile=classes.lst \
     -XX:SharedArchiveFile=app-cds.jsa -jar app.jar

# Step 3: Use archive (faster startup)
java -Xshare:on -XX:SharedArchiveFile=app-cds.jsa -jar app.jar
```

Startup improvement: 20-40% for Spring Boot applications.

## Key Metrics to Monitor

| Metric | Tool | Alert Threshold |
|--------|------|-----------------|
| GC pause duration | JFR / Micrometer | > 200ms (G1), > 1ms (ZGC) |
| GC frequency | JFR / Prometheus | > 10/min (may need more heap) |
| Heap utilization | JMX / Actuator | > 80% sustained |
| Thread count | JMX | Growing unbounded |
| CPU utilization | OS metrics | > 80% sustained |
| Allocation rate | JFR | Sudden spikes = leak candidate |

## Common Performance Mistakes

| Issue | Symptom | Fix |
|-------|---------|-----|
| Too-small heap | Frequent GC, OOM | Increase `-Xmx` or fix leaks |
| String concatenation in loops | High allocation rate | `StringBuilder` or `String.join` |
| Autoboxing in hot paths | Excessive GC | Use primitive types/collections |
| Unbounded caches | Memory leak | Use Caffeine with `maximumSize` |
| N+1 queries | High DB latency | Batch fetch, join fetch |
| Synchronized hot path | Thread contention | `ReentrantLock` or lock-free |
