<script lang="ts">
  interface Props {
    initial?: number;
    onstep?: (count: number) => void;
  }

  let { initial = 0, onstep }: Props = $props();

  let count = $state(initial);
  let doubled = $derived(count * 2);
  let parity = $derived(count % 2 === 0 ? 'even' : 'odd');

  function increment() {
    count++;
    onstep?.(count);
  }

  function decrement() {
    count--;
    onstep?.(count);
  }

  function reset() {
    count = initial;
    onstep?.(count);
  }
</script>

<div class="counter">
  <button onclick={decrement} aria-label="Decrement">-</button>
  <output>{count}</output>
  <button onclick={increment} aria-label="Increment">+</button>
</div>

<p>Doubled: {doubled} | Parity: {parity}</p>
<button onclick={reset}>Reset</button>

<style>
  .counter {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  output {
    min-width: 3ch;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }
</style>
