---
type: fact
title: "React common mistakes: ranked anti-patterns with fixes"
---

# Common React Mistakes (Ranked by Impact)

## 1. useEffect for Data Fetching (HIGH)

**Wrong:**
```tsx
function UserProfile({ id }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/users/${id}`)
      .then(r => r.json())
      .then(data => { setUser(data); setLoading(false); });
  }, [id]);
}
```

Problems: race conditions, no caching, waterfalls, loading state boilerplate.

**Right:** Server Component fetch, `use()` with promise, or TanStack Query.

---

## 2. Derived State in useEffect (HIGH)

**Wrong:**
```tsx
const [items, setItems] = useState(allItems);
const [filter, setFilter] = useState("");
const [filteredItems, setFilteredItems] = useState(allItems);

useEffect(() => {
  setFilteredItems(items.filter(i => i.name.includes(filter)));
}, [items, filter]);
```

**Right:** Compute during render.
```tsx
const [items, setItems] = useState(allItems);
const [filter, setFilter] = useState("");
const filteredItems = items.filter(i => i.name.includes(filter));
```

---

## 3. State That Should Be a Key (MEDIUM-HIGH)

**Wrong:**
```tsx
function ChatRoom({ roomId }) {
  const [messages, setMessages] = useState([]);
  useEffect(() => {
    setMessages([]); // "reset" on room change
    loadMessages(roomId).then(setMessages);
  }, [roomId]);
}
```

**Right:** Key forces remount = clean state.
```tsx
// Parent:
<ChatRoom key={roomId} roomId={roomId} />

// ChatRoom doesn't need reset logic
function ChatRoom({ roomId }) {
  const [messages, setMessages] = useState([]);
  // fresh instance per roomId
}
```

---

## 4. Unnecessary 'use client' (MEDIUM)

**Wrong:** Marking entire pages/layouts as Client Components.

**Right:** Only interactive leaf components need `'use client'`. Keep data-fetching components on the server.

---

## 5. Unstable Keys (MEDIUM)

**Wrong:**
```tsx
{items.map((item, index) => <Item key={index} {...item} />)}
// or worse:
{items.map(item => <Item key={Math.random()} {...item} />)}
```

**Right:**
```tsx
{items.map(item => <Item key={item.id} {...item} />)}
```

Unstable keys cause: lost input state, broken animations, unnecessary DOM mutations.

---

## 6. State Stored Too High (MEDIUM)

**Wrong:** Modal open/close state in root layout affecting entire app re-render.

**Right:** Colocate state in the component that owns it. Lift only when siblings need it.

---

## 7. useEffect as Event Handler (MEDIUM)

**Wrong:**
```tsx
useEffect(() => {
  if (submitted) {
    sendAnalytics();
    setSubmitted(false);
  }
}, [submitted]);
```

**Right:** Call in the event handler directly.
```tsx
function handleSubmit() {
  submitForm();
  sendAnalytics(); // here, not in effect
}
```

---

## 8. Prop Drilling (LOW-MEDIUM)

**Wrong:** Passing `theme` through 5 levels of components.

**Right:**
- Composition (pass rendered elements as children)
- Context for truly cross-cutting concerns (theme, auth, locale)
- Component composition with slots

---

## 9. Stale Closure in Effects (LOW-MEDIUM)

**Wrong:**
```tsx
useEffect(() => {
  const id = setInterval(() => {
    setCount(count + 1); // stale: captures initial count
  }, 1000);
  return () => clearInterval(id);
}, []); // missing dep
```

**Right:**
```tsx
useEffect(() => {
  const id = setInterval(() => {
    setCount(c => c + 1); // updater function: always fresh
  }, 1000);
  return () => clearInterval(id);
}, []);
```

---

## 10. forwardRef in React 19 (LOW)

**Wrong:**
```tsx
const Input = forwardRef<HTMLInputElement, Props>((props, ref) => (
  <input ref={ref} {...props} />
));
```

**Right:**
```tsx
function Input({ ref, ...props }: Props & { ref?: React.Ref<HTMLInputElement> }) {
  return <input ref={ref} {...props} />;
}
```

---

## 11. Context.Provider in React 19 (LOW)

**Wrong:**
```tsx
<ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
```

**Right:**
```tsx
<ThemeContext value={theme}>{children}</ThemeContext>
```

---

## 12. Missing Error Boundaries (LOW but catastrophic)

**Wrong:** No error handling  -  one component crash takes down the whole app.

**Right:**
```tsx
<ErrorBoundary fallback={<ErrorMessage />}>
  <Suspense fallback={<Skeleton />}>
    <AsyncComponent />
  </Suspense>
</ErrorBoundary>
```

---

## Quick Reference: Effect vs No Effect

| Situation | Use Effect? |
|-----------|-------------|
| Fetch data | NO  -  Server Component / use() / TanStack Query |
| Sync state from props | NO  -  compute during render |
| Reset state on prop change | NO  -  use key |
| Respond to event | NO  -  call in event handler |
| Subscribe to external store | YES  -  `useEffect` or `useSyncExternalStore` |
| Set up DOM listener | YES  -  `useEffect` with cleanup |
| Measure DOM element | YES  -  `useLayoutEffect` |
| Initialize third-party lib | YES  -  `useEffect` once |
