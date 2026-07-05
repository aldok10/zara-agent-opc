import { Component, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

@Component({
  selector: 'app-data-loading',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <div class="user-list">
      <div class="controls">
        <input
          type="search"
          placeholder="Filter by name..."
          [ngModel]="filterText()"
          (ngModelChange)="filterText.set($event)"
        />
        <select [ngModel]="roleFilter()" (ngModelChange)="roleFilter.set($event)">
          <option value="">All roles</option>
          <option value="admin">Admin</option>
          <option value="user">User</option>
        </select>
        <button (click)="usersResource.reload()">Refresh</button>
      </div>

      @if (usersResource.isLoading()) {
        <div class="loading" role="status" aria-label="Loading users">
          <span>Loading users...</span>
        </div>
      } @else if (usersResource.error(); as err) {
        <div class="error" role="alert">
          <p>Failed to load users.</p>
          <button (click)="usersResource.reload()">Retry</button>
        </div>
      } @else {
        @for (user of filteredUsers(); track user.id) {
          <article class="user-card">
            <h3>{{ user.name }}</h3>
            <p>{{ user.email }}</p>
            <span class="badge" [attr.data-role]="user.role">{{ user.role }}</span>
          </article>
        } @empty {
          <p>No users match your filter.</p>
        }

        <p class="count">
          Showing {{ filteredUsers().length }} of {{ usersResource.value()?.length ?? 0 }} users
        </p>
      }
    </div>
  `,
})
export class DataLoadingComponent {
  // Filter state
  readonly filterText = signal('');
  readonly roleFilter = signal<string>('');

  // httpResource  -  reactive HTTP data loading
  // Automatically handles loading/error/value states
  // Re-fetches when reactive dependencies in the URL function change
  readonly usersResource = httpResource<User[]>('/api/users');

  // Computed  -  client-side filtering of loaded data
  readonly filteredUsers = computed(() => {
    const users = this.usersResource.value() ?? [];
    const text = this.filterText().toLowerCase();
    const role = this.roleFilter();

    return users.filter(user => {
      const matchesText = !text || user.name.toLowerCase().includes(text);
      const matchesRole = !role || user.role === role;
      return matchesText && matchesRole;
    });
  });
}
