'use server'

import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { revalidateTag } from 'next/cache'
import { headers } from 'next/headers'

// --- Schema: define shape + constraints upfront ---
const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  bio: z.string().max(500).trim().optional(),
})

// --- State type for useActionState ---
type ActionState = {
  error?: string
  success?: boolean
  fieldErrors?: Record<string, string[]>
}

export async function updateProfile(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  // 1. AUTHENTICATE
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'You must be logged in to update your profile.' }
  }

  // 2. VALIDATE INPUT
  const raw = {
    name: formData.get('name'),
    bio: formData.get('bio'),
  }

  const parsed = updateProfileSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      error: 'Please fix the errors below.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  // 3. AUTHORIZE (user can only update own profile)
  // In this case, we update by session.user.id so ownership is implicit.
  // For operations on other entities, fetch the entity and check ownership:
  //   const item = await db.item.findUnique({ where: { id } })
  //   if (item.ownerId !== session.user.id) return { error: 'Forbidden' }

  // 4. MUTATE via Data Access Layer
  try {
    await db.user.update({
      where: { id: session.user.id },
      data: {
        name: parsed.data.name,
        bio: parsed.data.bio ?? null,
      },
    })
  } catch {
    return { error: 'Failed to update profile. Please try again.' }
  }

  // 5. REVALIDATE cached data
  revalidateTag('user-profile')
  revalidateTag(`user-${session.user.id}`)

  // 6. RETURN success
  return { success: true }
}
