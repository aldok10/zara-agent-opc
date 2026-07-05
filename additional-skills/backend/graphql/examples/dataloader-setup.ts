/**
 * DataLoader Setup with Batching and Error Handling
 *
 * Production-ready DataLoader configuration for a GraphQL server.
 * Demonstrates: typed loaders, batch functions, error handling, cache priming, context integration.
 */

import DataLoader from "dataloader";
import type { Database } from "./db";

// ─── Types ──────────────────────────────────────────────────────────────────

interface User {
  id: string;
  name: string;
  email: string;
  teamId: string;
}

interface Post {
  id: string;
  authorId: string;
  title: string;
  body: string;
  createdAt: Date;
}

interface Comment {
  id: string;
  postId: string;
  authorId: string;
  body: string;
}

// ─── Batch Functions ────────────────────────────────────────────────────────

/**
 * Batch function for loading users by ID.
 * Returns results in SAME ORDER as input keys. Missing keys get null.
 */
async function batchUsers(
  db: Database,
  ids: readonly string[]
): Promise<(User | Error)[]> {
  const users = await db.query<User>(
    `SELECT * FROM users WHERE id = ANY($1)`,
    [ids as string[]]
  );

  const userMap = new Map(users.map((u) => [u.id, u]));

  // Must return in same order as input, with null/Error for missing
  return ids.map(
    (id) => userMap.get(id) ?? new Error(`User ${id} not found`)
  );
}

/**
 * Batch function for loading posts by author ID (one-to-many).
 * Each key maps to an ARRAY of posts.
 */
async function batchPostsByAuthor(
  db: Database,
  authorIds: readonly string[]
): Promise<Post[][]> {
  const posts = await db.query<Post>(
    `SELECT * FROM posts WHERE author_id = ANY($1) ORDER BY created_at DESC`,
    [authorIds as string[]]
  );

  const grouped = new Map<string, Post[]>();
  for (const post of posts) {
    const list = grouped.get(post.authorId) ?? [];
    list.push(post);
    grouped.set(post.authorId, list);
  }

  // Return empty array (not null) for authors with no posts
  return authorIds.map((id) => grouped.get(id) ?? []);
}

/**
 * Batch function for loading comments by post ID (one-to-many).
 */
async function batchCommentsByPost(
  db: Database,
  postIds: readonly string[]
): Promise<Comment[][]> {
  const comments = await db.query<Comment>(
    `SELECT * FROM comments WHERE post_id = ANY($1) ORDER BY created_at ASC`,
    [postIds as string[]]
  );

  const grouped = new Map<string, Comment[]>();
  for (const comment of comments) {
    const list = grouped.get(comment.postId) ?? [];
    list.push(comment);
    grouped.set(comment.postId, list);
  }

  return postIds.map((id) => grouped.get(id) ?? []);
}

// ─── Loader Factory (per-request) ──────────────────────────────────────────

export interface Loaders {
  userLoader: DataLoader<string, User>;
  postsByAuthorLoader: DataLoader<string, Post[]>;
  commentsByPostLoader: DataLoader<string, Comment[]>;
}

/**
 * Creates a fresh set of DataLoaders for each request.
 * NEVER share loaders across requests (stale cache, data leakage).
 */
export function createLoaders(db: Database): Loaders {
  return {
    userLoader: new DataLoader<string, User>(
      (ids) => batchUsers(db, ids),
      {
        maxBatchSize: 1000, // Match DB IN clause limit
        // cache: true (default) -- deduplicates within request
      }
    ),

    postsByAuthorLoader: new DataLoader<string, Post[]>(
      (authorIds) => batchPostsByAuthor(db, authorIds),
      { maxBatchSize: 500 }
    ),

    commentsByPostLoader: new DataLoader<string, Comment[]>(
      (postIds) => batchCommentsByPost(db, postIds),
      { maxBatchSize: 500 }
    ),
  };
}

// ─── Context Integration ────────────────────────────────────────────────────

export interface GraphQLContext {
  user: { id: string; roles: string[] } | null;
  loaders: Loaders;
  db: Database;
}

/**
 * Context factory for Apollo Server / GraphQL Yoga.
 * Fresh loaders per request.
 */
export function createContext(req: Request, db: Database): GraphQLContext {
  return {
    user: extractUser(req), // Your auth logic
    loaders: createLoaders(db),
    db,
  };
}

function extractUser(req: Request) {
  // Placeholder -- implement JWT/session validation
  return null;
}

// ─── Resolver Usage ─────────────────────────────────────────────────────────

export const resolvers = {
  Query: {
    user: (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      return ctx.loaders.userLoader.load(args.id);
    },

    users: async (_: unknown, args: { ids: string[] }, ctx: GraphQLContext) => {
      // loadMany returns (User | Error)[] -- filter errors as needed
      const results = await ctx.loaders.userLoader.loadMany(args.ids);
      return results.filter((r): r is User => !(r instanceof Error));
    },
  },

  User: {
    posts: (user: User, _args: unknown, ctx: GraphQLContext) => {
      // DataLoader batches all User.posts calls into single query
      return ctx.loaders.postsByAuthorLoader.load(user.id);
    },
  },

  Post: {
    author: (post: Post, _args: unknown, ctx: GraphQLContext) => {
      // Even if 50 posts have same authorId, DataLoader deduplicates
      return ctx.loaders.userLoader.load(post.authorId);
    },

    comments: (post: Post, _args: unknown, ctx: GraphQLContext) => {
      return ctx.loaders.commentsByPostLoader.load(post.id);
    },
  },

  Comment: {
    author: (comment: Comment, _args: unknown, ctx: GraphQLContext) => {
      return ctx.loaders.userLoader.load(comment.authorId);
    },
  },
};

// ─── Cache Priming (after list/create operations) ───────────────────────────

/**
 * After fetching a list of users, prime the loader so individual
 * .load(userId) calls don't trigger additional queries.
 */
export function primeUserLoader(loaders: Loaders, users: User[]): void {
  for (const user of users) {
    loaders.userLoader.prime(user.id, user);
  }
}
