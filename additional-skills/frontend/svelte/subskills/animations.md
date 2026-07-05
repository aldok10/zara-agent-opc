---
type: subskill
title: "Subskill: Animations"
---

# Subskill: Animations

## Activation

Triggered when task involves: transitions, animations, motion, fly, fade, slide, crossfade, animate directive, spring, tweened.

## Core Principles

1. **Built-in transitions** for enter/exit animations (`transition:`, `in:`, `out:`).
2. **Animate directive** for list reordering (`animate:flip`).
3. **Motion** utilities (`spring`, `tweened`) for interpolated values.
4. **CSS transitions preferred**  -  GPU-accelerated, non-blocking.
5. **Reduced motion**  -  always respect `prefers-reduced-motion`.

## Decision Table

| Need | Use | Import from |
|------|-----|-------------|
| Enter + exit | `transition:fade` | `svelte/transition` |
| Enter only | `in:fly` | `svelte/transition` |
| Exit only | `out:slide` | `svelte/transition` |
| List reorder | `animate:flip` | `svelte/animate` |
| Shared element | `crossfade` | `svelte/transition` |
| Smooth value change | `spring()` / `tweened()` | `svelte/motion` |
| Complex keyframes | CSS `@keyframes` + class toggle | Native CSS |
| Scroll-driven | Intersection Observer + class | Native API |

## Patterns

### Basic Transitions

```svelte
<script lang="ts">
  import { fade, fly, slide, scale } from 'svelte/transition';

  let visible = $state(true);
</script>

<button onclick={() => visible = !visible}>Toggle</button>

{#if visible}
  <div transition:fade={{ duration: 200 }}>Fades in and out</div>
  <div in:fly={{ y: -20, duration: 300 }} out:fade>Flies in, fades out</div>
  <div transition:slide={{ axis: 'x' }}>Slides horizontally</div>
  <div transition:scale={{ start: 0.8 }}>Scales from 80%</div>
{/if}
```

### List Animations (FLIP)

```svelte
<script lang="ts">
  import { flip } from 'svelte/animate';
  import { fade } from 'svelte/transition';

  let items = $state([
    { id: 1, name: 'First' },
    { id: 2, name: 'Second' },
    { id: 3, name: 'Third' },
  ]);

  function shuffle() {
    items = items.toSorted(() => Math.random() - 0.5);
  }
</script>

<button onclick={shuffle}>Shuffle</button>

<ul>
  {#each items as item (item.id)}
    <li animate:flip={{ duration: 300 }} transition:fade>
      {item.name}
    </li>
  {/each}
</ul>
```

### Crossfade (Shared Element)

```svelte
<script lang="ts">
  import { crossfade } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';

  const [send, receive] = crossfade({
    duration: 400,
    easing: quintOut,
    fallback: (node) => ({
      duration: 300,
      css: (t) => `opacity: ${t}`,
    }),
  });

  let selected = $state<string | null>(null);
  let items = $state(['Apple', 'Banana', 'Cherry']);
</script>

<div class="lists">
  <ul>
    {#each items.filter(i => i !== selected) as item (item)}
      <li
        in:receive={{ key: item }}
        out:send={{ key: item }}
        onclick={() => selected = item}
      >
        {item}
      </li>
    {/each}
  </ul>

  {#if selected}
    <div
      class="selected"
      in:receive={{ key: selected }}
      out:send={{ key: selected }}
    >
      {selected}
      <button onclick={() => selected = null}>Back</button>
    </div>
  {/if}
</div>
```

### Spring & Tweened

```svelte
<script lang="ts">
  import { spring, tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';

  // Spring: physics-based, good for user interaction
  let coords = spring({ x: 0, y: 0 }, {
    stiffness: 0.1,
    damping: 0.5,
  });

  // Tweened: duration-based, good for progress bars
  let progress = tweened(0, {
    duration: 400,
    easing: cubicOut,
  });

  function handleMove(e: MouseEvent) {
    coords.set({ x: e.clientX, y: e.clientY });
  }
</script>

<svelte:window onmousemove={handleMove} />

<div style="transform: translate({$coords.x}px, {$coords.y}px)">
  Follows cursor
</div>

<button onclick={() => progress.set(1)}>Complete</button>
<progress value={$progress} max="1" />
```

### Custom Transition

```typescript
// src/lib/transitions/typewriter.ts
import type { TransitionConfig } from 'svelte/transition';

export function typewriter(node: HTMLElement, {
  speed = 50,
  delay = 0,
}: { speed?: number; delay?: number } = {}): TransitionConfig {
  const text = node.textContent ?? '';
  const duration = text.length * speed;

  return {
    delay,
    duration,
    tick(t) {
      const i = Math.trunc(text.length * t);
      node.textContent = text.slice(0, i);
    },
  };
}
```

### Respecting Reduced Motion

```svelte
<script lang="ts">
  import { fade, fly } from 'svelte/transition';

  // Check user preference
  const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  // Use simpler transition when reduced motion preferred
  const transition = reducedMotion
    ? (node: HTMLElement) => fade(node, { duration: 0 })
    : (node: HTMLElement) => fly(node, { y: 20, duration: 300 });
</script>

{#if visible}
  <div transition:transition>Content</div>
{/if}
```

## Transition Parameters

| Transition | Parameters |
|-----------|------------|
| `fade` | `delay`, `duration`, `easing` |
| `fly` | `delay`, `duration`, `easing`, `x`, `y`, `opacity` |
| `slide` | `delay`, `duration`, `easing`, `axis` |
| `scale` | `delay`, `duration`, `easing`, `start`, `opacity` |
| `blur` | `delay`, `duration`, `easing`, `amount`, `opacity` |
| `draw` | `delay`, `duration`, `easing`, `speed` (SVG only) |

## Rules

- Always provide `(item.id)` key in `{#each}` when using `animate:`.
- Use `transition:` for toggle, `in:/out:` for asymmetric enter/exit.
- Prefer CSS-based transitions (return `css` function) over tick-based for performance.
- Test animations with `prefers-reduced-motion: reduce`  -  provide fallback or skip.
- Keep durations under 400ms for UI interactions; longer only for decorative.
- `local` modifier (`transition:fade|local`) for transitions that only play on direct block toggle, not parent.
