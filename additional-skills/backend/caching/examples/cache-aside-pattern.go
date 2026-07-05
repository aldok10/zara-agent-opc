package cache

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math/rand/v2"
	"time"

	"github.com/redis/go-redis/v9"
	"golang.org/x/sync/singleflight"
)

// CacheAside implements cache-aside pattern with stampede protection.
// Features: singleflight dedup, jittered TTL, graceful Redis failure.
type CacheAside[T any] struct {
	redis  *redis.Client
	group  singleflight.Group
	prefix string
	ttl    time.Duration
}

func NewCacheAside[T any](client *redis.Client, prefix string, ttl time.Duration) *CacheAside[T] {
	return &CacheAside[T]{
		redis:  client,
		prefix: prefix,
		ttl:    ttl,
	}
}

// Get retrieves from cache or fetches from source on miss.
// Singleflight prevents duplicate fetches for same key within this instance.
func (c *CacheAside[T]) Get(ctx context.Context, key string, fetch func(ctx context.Context) (T, error)) (T, error) {
	cacheKey := c.key(key)

	// Try cache first
	val, err := c.getFromCache(ctx, cacheKey)
	if err == nil {
		return val, nil
	}

	// Cache miss or Redis error: fetch with singleflight dedup
	result, err, _ := c.group.Do(cacheKey, func() (any, error) {
		return c.fetchAndCache(ctx, cacheKey, fetch)
	})
	if err != nil {
		var zero T
		return zero, err
	}

	return result.(T), nil
}

// Invalidate removes a key from cache.
func (c *CacheAside[T]) Invalidate(ctx context.Context, key string) error {
	return c.redis.Del(ctx, c.key(key)).Err()
}

// Set explicitly writes to cache (used for write-through pattern).
func (c *CacheAside[T]) Set(ctx context.Context, key string, value T) error {
	data, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("marshal cache value: %w", err)
	}

	ttl := c.jitteredTTL()
	return c.redis.Set(ctx, c.key(key), data, ttl).Err()
}

func (c *CacheAside[T]) getFromCache(ctx context.Context, cacheKey string) (T, error) {
	var zero T

	data, err := c.redis.Get(ctx, cacheKey).Bytes()
	if err != nil {
		return zero, err
	}

	var val T
	if err := json.Unmarshal(data, &val); err != nil {
		// Corrupted cache entry: delete and treat as miss
		_ = c.redis.Del(ctx, cacheKey).Err()
		return zero, errors.New("corrupted cache entry")
	}

	return val, nil
}

func (c *CacheAside[T]) fetchAndCache(ctx context.Context, cacheKey string, fetch func(ctx context.Context) (T, error)) (T, error) {
	val, err := fetch(ctx)
	if err != nil {
		var zero T
		return zero, err
	}

	// Best-effort cache write: don't fail the request if Redis is down
	data, marshalErr := json.Marshal(val)
	if marshalErr == nil {
		ttl := c.jitteredTTL()
		_ = c.redis.Set(ctx, cacheKey, data, ttl).Err()
	}

	return val, nil
}

// jitteredTTL adds ±10% random jitter to prevent synchronized expiry.
func (c *CacheAside[T]) jitteredTTL() time.Duration {
	jitter := float64(c.ttl) * 0.1 * (2*rand.Float64() - 1)
	return c.ttl + time.Duration(jitter)
}

func (c *CacheAside[T]) key(id string) string {
	return c.prefix + ":" + id
}

// --- Usage Example ---
//
// type User struct {
//     ID    string `json:"id"`
//     Name  string `json:"name"`
//     Email string `json:"email"`
// }
//
// userCache := cache.NewCacheAside[User](redisClient, "user:v1", 5*time.Minute)
//
// user, err := userCache.Get(ctx, "123", func(ctx context.Context) (User, error) {
//     return db.GetUser(ctx, "123")
// })
//
// // After update:
// _ = userCache.Invalidate(ctx, "123")
// // Or write-through:
// _ = userCache.Set(ctx, "123", updatedUser)
