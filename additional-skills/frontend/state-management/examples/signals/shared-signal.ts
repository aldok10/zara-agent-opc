/**
 * Cross-component shared signal pattern using @preact/signals-react
 * Same pattern works with @preact/signals for Preact projects
 */
import { signal, computed, effect, batch } from '@preact/signals-react';

// --- Theme Signal (module-level singleton) ---

type Theme = 'light' | 'dark' | 'system';

export const theme = signal<Theme>('system');
export const resolvedTheme = computed<'light' | 'dark'>(() => {
  if (theme.value === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return theme.value;
});
export const isDark = computed(() => resolvedTheme.value === 'dark');

export function toggleTheme() {
  theme.value = isDark.value ? 'light' : 'dark';
}

// --- Notification Signal ---

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  createdAt: number;
}

export const notifications = signal<Notification[]>([]);
export const unreadCount = computed(() => notifications.value.length);

export function addNotification(type: Notification['type'], message: string) {
  const id = crypto.randomUUID();
  notifications.value = [
    ...notifications.value,
    { id, type, message, createdAt: Date.now() },
  ];

  // Auto-dismiss after 5s
  setTimeout(() => dismissNotification(id), 5000);
}

export function dismissNotification(id: string) {
  notifications.value = notifications.value.filter((n) => n.id !== id);
}

// --- Connection Status Signal ---

export const isOnline = signal(navigator.onLine);

// Side effect: sync with browser events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { isOnline.value = true; });
  window.addEventListener('offline', () => { isOnline.value = false; });
}

// --- Batch Example ---

export const firstName = signal('');
export const lastName = signal('');
export const fullName = computed(() =>
  `${firstName.value} ${lastName.value}`.trim(),
);

// Batch prevents intermediate computed recalculations
export function setFullName(first: string, last: string) {
  batch(() => {
    firstName.value = first;
    lastName.value = last;
  });
}

// --- Usage in React components ---
// These signals work directly in JSX without hooks:
//
// function ThemeToggle() {
//   return <button onClick={toggleTheme}>{isDark.value ? 'Light' : 'Dark'}</button>;
// }
//
// function NotificationBadge() {
//   return unreadCount.value > 0 ? <span>{unreadCount}</span> : null;
// }
//
// Key advantage: only the TEXT NODE re-renders, not the component.
