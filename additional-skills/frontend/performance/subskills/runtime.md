---
name: runtime
trigger: "Long tasks, main thread, scheduler.yield, Web Worker, performance profiling, jank"
---

# Runtime Performance

## Activation

User needs to fix jank, long tasks, unresponsive interactions, or needs Web Worker / scheduling strategies.

## Core Principles

- Main thread budget: <50ms per task (anything longer blocks interactions)
- Break long tasks with `scheduler.yield()` or `setTimeout(0)`
- Heavy computation belongs in Web Workers
- Virtualize long lists (don't render 10,000 DOM nodes)
- Profile first with Chrome DevTools Performance tab
- INP = longest interaction; optimize the worst one first

## Decision Table

| Symptom | Root Cause | Fix |
|---------|-----------|-----|
| Click feels delayed | Long task blocking main thread | `scheduler.yield()` between chunks |
| Scroll jank | Too many DOM nodes / paint | Virtualize list, `will-change` |
| Input lag | Expensive re-render on keystroke | Debounce, `useDeferredValue` |
| Animation stutter | Layout thrashing | Batch reads/writes, use transform |
| Slow initial load | Too much JS parsed | Code split, defer non-critical |

## Patterns

### scheduler.yield() for chunked work

> **Browser support:** Chrome 129+, Edge 129+, Firefox 134+. **Not supported in Safari** (as of mid-2026).
> Always include a fallback. Key difference: `scheduler.yield()` preserves task priority (continuation runs before other queued tasks); `setTimeout` does not.

```ts
// Fallback-safe yield helper
const yieldToMain: () => Promise<void> =
  globalThis.scheduler?.yield ?? (() => new Promise((r) => setTimeout(r, 0)));

async function processLargeList(items: Item[]) {
  const results: Result[] = [];

  for (let i = 0; i < items.length; i++) {
    results.push(transform(items[i]));

    // Yield every 10 items to keep main thread responsive
    if (i % 10 === 9) {
      await yieldToMain();
    }
  }

  return results;
}
```

### Web Worker for heavy computation

```ts
// worker.ts
self.onmessage = (e: MessageEvent<{ data: number[] }>) => {
  const result = heavyComputation(e.data.data);
  self.postMessage(result);
};

function heavyComputation(data: number[]): number {
  return data.reduce((sum, val) => sum + Math.sqrt(val), 0);
}

// main.ts
const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });

function computeAsync(data: number[]): Promise<number> {
  return new Promise((resolve) => {
    worker.onmessage = (e) => resolve(e.data);
    worker.postMessage({ data });
  });
}
```

### Debounced input (React)

```tsx
import { useDeferredValue, useState, useMemo } from 'react';

function SearchResults({ query }: { query: string }) {
  const deferredQuery = useDeferredValue(query);
  const isStale = query !== deferredQuery;

  const results = useMemo(() => filterResults(deferredQuery), [deferredQuery]);

  return (
    <div style={{ opacity: isStale ? 0.7 : 1 }}>
      {results.map(r => <ResultItem key={r.id} item={r} />)}
    </div>
  );
}
```

### List virtualization

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualList({ items }: { items: Item[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
    overscan: 5,
  });

  return (
    <div ref={parentRef} style={{ height: '400px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: `${virtualItem.start}px`,
              height: `${virtualItem.size}px`,
              width: '100%',
            }}
          >
            {items[virtualItem.index].name}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Avoid layout thrashing

```ts
// Bad: read-write-read-write (forces synchronous layout)
elements.forEach(el => {
  const height = el.offsetHeight; // read (forces layout)
  el.style.height = `${height + 10}px`; // write (invalidates layout)
});

// Good: batch reads, then batch writes
const heights = elements.map(el => el.offsetHeight); // all reads
elements.forEach((el, i) => {
  el.style.height = `${heights[i] + 10}px`; // all writes
});
```

### requestIdleCallback for non-urgent work

```ts
function scheduleNonUrgent(callback: () => void) {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(callback, { timeout: 2000 });
  } else {
    setTimeout(callback, 100);
  }
}

// Usage: analytics, prefetching, non-critical updates
scheduleNonUrgent(() => {
  sendAnalyticsEvent('page_viewed');
});
```

## Profiling Workflow

1. Open Chrome DevTools > Performance tab
2. Check "CPU 4x slowdown" for realistic mobile simulation
3. Click Record, perform the interaction
4. Look for: Long Tasks (red), Layout Shifts, Forced Reflows
5. Identify the function in the flame chart
6. Optimize that specific function
