/**
 * Server Component data fetching pattern.
 *
 * Demonstrates:
 * - Server Component fetching data directly (no useEffect)
 * - Passing promise to Client Component via use()
 * - Suspense for streaming
 * - Error boundary for failures
 */

import { Suspense } from "react";

// --- Types ---
interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
}

interface Review {
  id: string;
  author: string;
  rating: number;
  body: string;
}

// --- Data layer (runs on server only) ---
async function getProduct(id: string): Promise<Product> {
  const res = await fetch(`${process.env.API_URL}/products/${id}`, {
    next: { revalidate: 60 }, // cache for 60s (Next.js)
  });
  if (!res.ok) throw new Error(`Product ${id} not found`);
  return res.json();
}

async function getReviews(productId: string): Promise<Review[]> {
  const res = await fetch(`${process.env.API_URL}/products/${productId}/reviews`);
  if (!res.ok) throw new Error("Failed to load reviews");
  return res.json();
}

// --- Server Component (default, no directive) ---
export default async function ProductPage({ params }: { params: { id: string } }) {
  // Fetch product immediately (blocking — needed for the page)
  const product = await getProduct(params.id);

  // Start reviews fetch but DON'T await — pass promise for streaming
  const reviewsPromise = getReviews(params.id);

  return (
    <main>
      {/* Renders immediately with product data */}
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <p aria-label="Price">${product.price.toFixed(2)}</p>

      {/* Streams in when reviews resolve */}
      <section aria-labelledby="reviews-heading">
        <h2 id="reviews-heading">Reviews</h2>
        <Suspense fallback={<ReviewsSkeleton />}>
          <ReviewsList reviewsPromise={reviewsPromise} />
        </Suspense>
      </section>
    </main>
  );
}

// --- Client Component (needs use() to unwrap promise) ---
"use client";

import { use } from "react";

function ReviewsList({ reviewsPromise }: { reviewsPromise: Promise<Review[]> }) {
  const reviews = use(reviewsPromise);

  if (reviews.length === 0) {
    return <p>No reviews yet.</p>;
  }

  return (
    <ul>
      {reviews.map((review) => (
        <li key={review.id}>
          <strong>{review.author}</strong>
          <span aria-label={`Rating: ${review.rating} out of 5`}>
            {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
          </span>
          <p>{review.body}</p>
        </li>
      ))}
    </ul>
  );
}

// --- Skeleton ---
function ReviewsSkeleton() {
  return (
    <div role="status" aria-label="Loading reviews">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="skeleton" style={{ height: 80, marginBottom: 8 }} />
      ))}
    </div>
  );
}
