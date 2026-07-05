---
type: subskill
title: "Subskill: Server Components"
---

# Subskill: Server Components

> Activate when: deciding Server vs Client boundaries, passing data from server to client, streaming, or using `use()` for async data.

## Core Principles

1. **Server Components are the default.** They run on the server, have zero JS bundle cost, and can directly access databases/filesystems/APIs.
2. **Client Components opt in** with `'use client'` at the top of the file. Use when you need hooks, event handlers, or browser APIs.
3. **The boundary is the import.** A Server Component can render Client Components. A Client Component cannot import Server Components (but can receive them as `children`).
4. **Data flows down.** Server → Client via props (must be serializable) or via promises unwrapped with `use()`.
5. **Streaming with Suspense.** Wrap async Server Components in `<Suspense>` to stream UI progressively.

## Decision Table: Server or Client?

| Need | Component Type |
|------|---------------|
| Fetch data, query DB, read files | Server |
| Render static/mostly-static content | Server |
| Use hooks (`useState`, `useEffect`, etc.) | Client |
| Attach event handlers (`onClick`, `onChange`) | Client |
| Use browser APIs (`window`, `localStorage`) | Client |
| Show loading/interactive states | Client |
| Access sensitive env vars/secrets | Server |
| Render heavy markdown/syntax highlighting | Server (zero JS cost) |

## Data Flow Patterns

### Pattern 1: Server fetches, renders directly

```tsx
// app/users/page.tsx (Server Component  -  no directive needed)
import { db } from "@/lib/db";

export default async function UsersPage() {
  const users = await db.user.findMany({ take: 20 });

  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

### Pattern 2: Server fetches, passes promise to Client

```tsx
// app/dashboard/page.tsx (Server Component)
import { getMetrics } from "@/lib/api";
import { MetricsChart } from "./metrics-chart";

export default function DashboardPage() {
  const metricsPromise = getMetrics(); // don't await  -  pass the promise

  return (
    <Suspense fallback={<ChartSkeleton />}>
      <MetricsChart dataPromise={metricsPromise} />
    </Suspense>
  );
}
```

```tsx
// app/dashboard/metrics-chart.tsx
"use client";

import { use } from "react";

export function MetricsChart({ dataPromise }: { dataPromise: Promise<Metrics[]> }) {
  const metrics = use(dataPromise); // suspends until resolved
  return <Chart data={metrics} />;
}
```

### Pattern 3: Composition  -  Server wraps Client

```tsx
// Server Component passes server-rendered content as children
import { InteractivePanel } from "./interactive-panel";
import { db } from "@/lib/db";

export default async function ProductPage({ id }: { id: string }) {
  const product = await db.product.findUnique({ where: { id } });

  return (
    <InteractivePanel>
      {/* This content is server-rendered, zero JS */}
      <h1>{product.name}</h1>
      <p>{product.description}</p>
    </InteractivePanel>
  );
}
```

```tsx
// interactive-panel.tsx
"use client";

import { useState, type ReactNode } from "react";

export function InteractivePanel({ children }: { children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div>
      <button onClick={() => setExpanded(!expanded)}>
        {expanded ? "Collapse" : "Expand"}
      </button>
      {expanded && children}
    </div>
  );
}
```

## Serialization Rules

Props passed from Server → Client must be serializable:

| Allowed | Not Allowed |
|---------|-------------|
| Strings, numbers, booleans, null | Functions (except Server Actions) |
| Plain objects, arrays | Classes, Dates (use `.toISOString()`) |
| `Promise` (for `use()`) | Symbols |
| Server Actions (`'use server'`) | DOM nodes, React elements with client refs |
| `ReactNode` (children) | Closures |

## Streaming and Suspense

```tsx
// Each Suspense boundary streams independently
export default function Page() {
  return (
    <main>
      <h1>Dashboard</h1>
      <Suspense fallback={<Skeleton />}>
        <SlowWidget /> {/* streams when ready */}
      </Suspense>
      <Suspense fallback={<Skeleton />}>
        <AnotherSlowWidget /> {/* streams independently */}
      </Suspense>
    </main>
  );
}
```

## Anti-Patterns

| Wrong | Right | Why |
|-------|-------|-----|
| `'use client'` on every component | Only where interactivity needed | Inflates JS bundle |
| Fetching in Client Component with useEffect | Fetch in Server Component, pass down | Extra round-trip, no streaming |
| Passing non-serializable props to Client | Serialize or restructure | Runtime error |
| Giant Client Component with some static parts | Split: Server wrapper + Client interactive part | Smaller bundle |
| `await` in Server Component without Suspense parent | Wrap in Suspense | Blocks entire page |

## Delegates To

- Next.js App Router specifics → `frontend-nextjs`
- Client-side state after hydration → `frontend-state`
- Form mutations via Server Actions → `subskills/forms-actions.md`
- Performance/code-splitting → `subskills/performance.md`
