<!--
  Example component: UserProfile.vue
  Demonstrates: <script setup>, reactive props destructuring, useTemplateRef,
  useId, defineEmits, computed, composable usage.
-->
<script setup lang="ts">
import { computed } from 'vue'
import { useSearch } from '~/composables/useSearch'

// Props: reactive destructuring (Vue 3.5+)
interface Props {
  userId: string
  displayName: string
  email: string
  avatarUrl?: string
  editable?: boolean
}
const { userId, displayName, email, avatarUrl, editable = false } = defineProps<Props>()

// Emits: typed
const emit = defineEmits<{
  save: [updates: { displayName: string; email: string }]
  delete: [userId: string]
}>()

// Template ref: type-safe (Vue 3.5+)
const nameInput = useTemplateRef<HTMLInputElement>('nameInput')

// Accessible IDs (Vue 3.5+)
const nameId = useId()
const emailId = useId()

// Local state
const editName = ref(displayName)
const editEmail = ref(email)

// Derived state via computed
const initials = computed(() =>
  displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
)

const hasChanges = computed(() =>
  editName.value !== displayName || editEmail.value !== email
)

// Composable usage: pass destructured prop via getter to preserve reactivity
const { results: suggestions } = useSearch<string>(
  () => editName.value,
  '/api/users/suggest',
  { debounce: 500, minLength: 3 },
)

// Actions
function handleSave() {
  emit('save', { displayName: editName.value, email: editEmail.value })
}

function handleDelete() {
  emit('delete', userId)
}

function focusName() {
  nameInput.value?.focus()
}
</script>

<template>
  <article class="user-profile" :aria-label="`Profile for ${displayName}`">
    <header class="user-profile__header">
      <img
        v-if="avatarUrl"
        :src="avatarUrl"
        :alt="`${displayName} avatar`"
        class="user-profile__avatar"
      />
      <span v-else class="user-profile__initials" aria-hidden="true">
        {{ initials }}
      </span>
      <h2>{{ displayName }}</h2>
    </header>

    <form v-if="editable" class="user-profile__form" @submit.prevent="handleSave">
      <div class="field">
        <label :for="nameId">Name</label>
        <input
          ref="nameInput"
          :id="nameId"
          v-model="editName"
          type="text"
          required
        />
      </div>

      <div class="field">
        <label :for="emailId">Email</label>
        <input :id="emailId" v-model="editEmail" type="email" required />
      </div>

      <ul v-if="suggestions.length" class="suggestions">
        <li v-for="name in suggestions" :key="name">{{ name }}</li>
      </ul>

      <div class="user-profile__actions">
        <button type="submit" :disabled="!hasChanges">Save</button>
        <button type="button" @click="handleDelete">Delete</button>
      </div>
    </form>

    <dl v-else class="user-profile__details">
      <dt>Email</dt>
      <dd>{{ email }}</dd>
    </dl>
  </article>
</template>
