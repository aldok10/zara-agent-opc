/**
 * Branded types for domain identifiers.
 * Demonstrates: brand utility, validation constructors, Zod integration, type safety.
 */

// --- Brand utility (zero runtime cost) ---
declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [__brand]: B };

// --- Domain types ---
type UserId = Brand<string, "UserId">;
type PostId = Brand<string, "PostId">;
type CommentId = Brand<string, "CommentId">;
type Email = Brand<string, "Email">;
type Slug = Brand<string, "Slug">;

// --- Validation constructors ---

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type Result<T, E = string> =
  | { ok: true; value: T }
  | { ok: false; error: E };

function UserId(value: string): Result<UserId> {
  if (!UUID_REGEX.test(value)) {
    return { ok: false, error: `Invalid UserId: expected UUID, got "${value}"` };
  }
  return { ok: true, value: value as UserId };
}

function PostId(value: string): Result<PostId> {
  if (!UUID_REGEX.test(value)) {
    return { ok: false, error: `Invalid PostId: expected UUID, got "${value}"` };
  }
  return { ok: true, value: value as PostId };
}

function CommentId(value: string): Result<CommentId> {
  if (!UUID_REGEX.test(value)) {
    return { ok: false, error: `Invalid CommentId: expected UUID, got "${value}"` };
  }
  return { ok: true, value: value as CommentId };
}

function Email(value: string): Result<Email> {
  const normalized = value.trim().toLowerCase();
  if (!EMAIL_REGEX.test(normalized)) {
    return { ok: false, error: `Invalid email: "${value}"` };
  }
  return { ok: true, value: normalized as Email };
}

function Slug(value: string): Result<Slug> {
  if (!SLUG_REGEX.test(value)) {
    return { ok: false, error: `Invalid slug: "${value}" (use lowercase, hyphens only)` };
  }
  if (value.length > 100) {
    return { ok: false, error: `Slug too long: ${value.length} chars (max 100)` };
  }
  return { ok: true, value: value as Slug };
}

// --- Unsafe constructors (for trusted sources like DB results) ---
function unsafeUserId(value: string): UserId {
  return value as UserId;
}

function unsafeEmail(value: string): Email {
  return value as Email;
}

// --- Domain models using branded types ---
interface User {
  id: UserId;
  email: Email;
  name: string;
}

interface Post {
  id: PostId;
  authorId: UserId;
  slug: Slug;
  title: string;
  body: string;
}

interface Comment {
  id: CommentId;
  postId: PostId;
  authorId: UserId;
  body: string;
}

// --- Type-safe functions ---
function getUser(_id: UserId): Promise<User | null> {
  // Implementation would query DB
  throw new Error("Not implemented");
}

function getPostBySlug(_slug: Slug): Promise<Post | null> {
  throw new Error("Not implemented");
}

function getCommentsByPost(_postId: PostId): Promise<Comment[]> {
  throw new Error("Not implemented");
}

// --- Usage demonstrating compile-time safety ---
function example() {
  const userId = UserId("550e8400-e29b-41d4-a716-446655440000");
  const postId = PostId("660e8400-e29b-41d4-a716-446655440001");

  if (!userId.ok || !postId.ok) {
    throw new Error("Invalid IDs");
  }

  // SAFE: types match
  getUser(userId.value);
  getCommentsByPost(postId.value);

  // COMPILE ERROR: cannot mix branded types
  // getUser(postId.value); // PostId not assignable to UserId
  // getCommentsByPost(userId.value); // UserId not assignable to PostId

  // COMPILE ERROR: raw string not accepted
  // getUser("some-id"); // string not assignable to UserId
}

// --- Branded type collections ---
type UserMap = Map<UserId, User>;
type PostIndex = Map<Slug, Post>;

export {
  type UserId,
  type PostId,
  type CommentId,
  type Email,
  type Slug,
  type Brand,
  type Result,
  UserId,
  PostId,
  CommentId,
  Email,
  Slug,
  unsafeUserId,
  unsafeEmail,
};
