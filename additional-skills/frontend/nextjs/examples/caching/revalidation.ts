import { unstable_cache } from 'next/cache'
import { revalidateTag, revalidatePath } from 'next/cache'
import { db } from '@/lib/db'

// --- Tag-based caching with unstable_cache ---
export const getProducts = unstable_cache(
  async (categoryId?: string) => {
    return db.product.findMany({
      where: categoryId ? { categoryId, active: true } : { active: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
  },
  ['products-list'],
  {
    tags: ['products'],
    revalidate: 3600, // Fallback: revalidate every hour even without tag invalidation
  }
)

// --- Per-entity caching ---
export const getProduct = unstable_cache(
  async (id: string) => {
    return db.product.findUnique({
      where: { id },
      include: { category: true, images: true },
    })
  },
  ['product-detail'],
  {
    tags: ['products'], // Invalidated when any product changes
    revalidate: 1800,
  }
)

// --- Fetch-based caching (external API) ---
export async function getExchangeRates() {
  const res = await fetch('https://api.example.com/rates', {
    next: {
      revalidate: 300, // 5 minutes
      tags: ['exchange-rates'],
    },
  })

  if (!res.ok) throw new Error('Failed to fetch rates')
  return res.json() as Promise<{ rates: Record<string, number> }>
}

// --- Revalidation in Server Action ---
export async function createProduct(data: { name: string; price: number; categoryId: string }) {
  await db.product.create({ data })

  // Invalidate all product caches
  revalidateTag('products')
}

export async function updateProduct(id: string, data: { name?: string; price?: number }) {
  await db.product.update({ where: { id }, data })

  // Invalidate product caches
  revalidateTag('products')

  // Also revalidate the specific product page
  revalidatePath(`/products/${id}`)
}

// --- Webhook Route Handler for CMS revalidation ---
// app/api/webhooks/cms/route.ts
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const headersList = await headers()
  const secret = headersList.get('x-webhook-secret')

  if (secret !== process.env.CMS_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
  }

  const payload = await request.json()
  const { type, slug } = payload as { type: string; slug: string }

  // Revalidate by content type
  revalidateTag(type)
  if (slug) {
    revalidateTag(`${type}-${slug}`)
  }

  return NextResponse.json({ revalidated: true, type, slug })
}
