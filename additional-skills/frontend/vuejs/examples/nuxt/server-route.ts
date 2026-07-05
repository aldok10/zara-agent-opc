/**
 * Example Nuxt server route: /api/posts/[id].get.ts
 * Demonstrates: param extraction, input validation, error handling, typed response.
 */
import { z } from 'zod'

interface Post {
  id: string
  title: string
  content: string
  authorId: string
  publishedAt: string | null
}

const ParamsSchema = z.object({
  id: z.string().uuid('Invalid post ID format'),
})

const QuerySchema = z.object({
  include: z.enum(['author', 'comments']).optional(),
})

export default defineEventHandler(async (event) => {
  // Validate route params
  const params = ParamsSchema.safeParse(getRouterParams(event))
  if (!params.success) {
    throw createError({
      statusCode: 400,
      message: params.error.issues[0].message,
    })
  }

  // Validate query params
  const query = QuerySchema.safeParse(getQuery(event))
  if (!query.success) {
    throw createError({
      statusCode: 400,
      message: `Invalid query: ${query.error.issues[0].message}`,
    })
  }

  // Fetch from database (example with any DB client)
  const post = await fetchPostById(params.data.id, {
    include: query.data.include,
  })

  if (!post) {
    throw createError({
      statusCode: 404,
      message: `Post ${params.data.id} not found`,
    })
  }

  return post
})

// Simulated data layer (replace with actual DB call)
async function fetchPostById(
  id: string,
  options: { include?: string },
): Promise<Post | null> {
  // e.g., prisma.post.findUnique({ where: { id }, include: ... })
  void options
  return {
    id,
    title: 'Example Post',
    content: 'Content here',
    authorId: 'user-1',
    publishedAt: new Date().toISOString(),
  }
}
