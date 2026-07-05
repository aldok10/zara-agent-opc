import { Component, ChangeDetectionStrategy, signal, computed, effect } from '@angular/core';

@Component({
  selector: 'app-counter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="counter">
      <h2>Counter: {{ count() }}</h2>
      <p>Double: {{ double() }}</p>
      <p>Parity: {{ parity() }}</p>

      <div class="actions">
        <button (click)="decrement()" [disabled]="count() <= 0">-</button>
        <button (click)="increment()">+</button>
        <button (click)="reset()">Reset</button>
      </div>

      @if (history().length) {
        <h3>History</h3>
        <ol>
          @for (entry of history(); track $index) {
            <li>{{ entry }}</li>
          }
        </ol>
      }
    </div>
  `,
})
export class CounterComponent {
  // Writable signal  -  primary state
  readonly count = signal(0);

  // Computed  -  derived state (lazy, memoized)
  readonly double = computed(() => this.count() * 2);
  readonly parity = computed(() => this.count() % 2 === 0 ? 'even' : 'odd');

  // Signal for history tracking
  readonly history = signal<string[]>([]);

  constructor() {
    // Effect  -  side effect on signal change
    effect(() => {
      const current = this.count();
      if (current > 0) {
        console.log(`Counter changed to: ${current}`);
      }
    });
  }

  increment(): void {
    this.count.update(v => v + 1);
    this.addHistory('increment');
  }

  decrement(): void {
    this.count.update(v => Math.max(0, v - 1));
    this.addHistory('decrement');
  }

  reset(): void {
    this.count.set(0);
    this.history.set([]);
  }

  private addHistory(action: string): void {
    this.history.update(h => [...h, `${action} -> ${this.count()}`]);
  }
}
