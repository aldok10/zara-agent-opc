// SvelteKit Load Function Example
// File: src/routes/posts/[slug]/+page.server.ts
//
// Demonstrates: typed params, error handling, dependency tracking, caching headers.

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

interface Post {
  slug: string;
  title: string;
  content: string;
  author: { name: string; avatar: string };
  publishedAt: string;
  tags: string[];
}

export const load: PageServerLoad = async ({ params, locals, depends, setHeaders }) => {
  // Declare dependency for fine-grained invalidation
  depends(`app:post:${params.slug}`);

  const post: Post | null = await locals.db.query(
    'SELECT * FROM posts WHERE slug = $1 AND published = true',
    [params.slug]
  );

  if (!post) {
    throw error(404, {
      message: `Post "${params.slug}" not found`,
    });
  }

  // Cache for 60s on CDN, stale-while-revalidate for 300s
  setHeaders({
    'cache-control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300',
  });

  // Fetch related posts in parallel
  const [related, comments] = await Promise.all([
    locals.db.query(
      'SELECT slug, title FROM posts WHERE $1 = ANY(tags) AND slug != $2 LIMIT 3',
      [post.tags[0], params.slug]
    ),
    locals.db.query(
      'SELECT * FROM comments WHERE post_slug = $1 ORDER BY created_at DESC',
      [params.slug]
    ),
  ]);

  return {
    post,
    related: related ?? [],
    comments: comments ?? [],
  };
};

// Optional: prerender specific slugs at build time
// export const prerender = true;

// Optional: streaming with promises (data available progressively)
// export const load: PageServerLoad = async ({ params, locals }) => {
//   const post = await locals.db.getPost(params.slug);
//   if (!post) throw error(404);
//
//   return {
//     post,
//     // Streamed: page renders immediately, comments load async
//     streamed: {
//       comments: locals.db.getComments(params.slug),
//     },
//   };
// };
