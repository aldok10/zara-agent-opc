/**
 * Example Pinia setup store: useAuthStore
 * Demonstrates: setup function syntax, computed getters, async actions,
 * composable composition, type safety.
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'user'
}

interface LoginCredentials {
  email: string
  password: string
}

export const useAuthStore = defineStore('auth', () => {
  // --- State ---
  const user = ref<User | null>(null)
  const token = ref<string | null>(null)
  const lastLoginAt = ref<Date | null>(null)

  // --- Getters (computed) ---
  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const isAdmin = computed(() => user.value?.role === 'admin')
  const displayName = computed(() => user.value?.name ?? 'Guest')

  // --- Actions ---
  async function login(credentials: LoginCredentials): Promise<void> {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Login failed' }))
      throw new Error(error.message)
    }

    const data: { user: User; token: string } = await response.json()
    user.value = data.user
    token.value = data.token
    lastLoginAt.value = new Date()
  }

  async function logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token.value}` },
      })
    } finally {
      // Always clear local state, even if API call fails
      user.value = null
      token.value = null
    }
  }

  async function refreshUser(): Promise<void> {
    if (!token.value) return

    const response = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token.value}` },
    })

    if (!response.ok) {
      // Token expired or invalid
      user.value = null
      token.value = null
      return
    }

    user.value = await response.json()
  }

  // --- Expose ---
  return {
    // State
    user,
    token,
    lastLoginAt,
    // Getters
    isAuthenticated,
    isAdmin,
    displayName,
    // Actions
    login,
    logout,
    refreshUser,
  }
})
