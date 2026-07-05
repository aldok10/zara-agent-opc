# Subscriptions

Real-time GraphQL. WebSocket transport, event filtering, scaling patterns, PubSub backends, SSE alternative, connection lifecycle.

## Rules

1. WebSocket (graphql-ws protocol) as primary transport -- `graphql-transport-ws` supersedes legacy `subscriptions-transport-ws`
2. Server-Sent Events (SSE) as lightweight alternative -- unidirectional, no connection upgrade, better through proxies
3. Filter events server-side -- never push all events to all clients and let them discard
4. PubSub backend must scale horizontally -- Redis Pub/Sub, Kafka, NATS (not in-memory for production)
5. Authenticate on connection_init -- validate token before accepting subscription, reject with 4401
6. Connection keep-alive (ping/pong every 30s) -- detect dead connections, clean up resources
7. Limit subscriptions per connection (max 10-20) -- prevent single client from exhausting server resources
8. Unsubscribe cleans up all server-side resources -- listeners, PubSub subscriptions, timers
9. Subscription resolvers are thin -- subscribe to channel, resolve maps event to schema type
10. Rate limit emitted events per subscription (max 10/s) -- throttle or sample during spikes

## Transport Comparison

| Transport | Bidirectional | Proxy-friendly | Reconnection | Use When |
|-----------|--------------|----------------|--------------|----------|
| WebSocket (graphql-ws) | Yes | Requires upgrade | Client-managed | Full duplex, high frequency |
| SSE | No (server→client) | Yes (HTTP) | Built-in | Simple updates, proxy constraints |
| HTTP polling | No | Yes | N/A | Fallback, low frequency |

## Architecture

```
Client ──WebSocket──→ Gateway/Router ──→ Subscription Server ──→ PubSub Backend
                                                                       ↑
                                                              Event Producers
                                                          (mutations, workers, CDC)
```

In Federation: Apollo Router supports subscriptions via HTTP callback or WebSocket passthrough to a single subgraph. The router does not split subscription operations across multiple subgraphs.

## Implementation Pattern

```typescript
import { createPubSub } from 'graphql-yoga'; // or graphql-subscriptions

const pubsub = createPubSub<{
  'order:created': [{ orderId: string; userId: string }];
  'order:updated': [{ orderId: string; status: string }];
}>();

const resolvers = {
  Subscription: {
    orderCreated: {
      subscribe: (_, { userId }, ctx) => {
        // Auth check
        if (ctx.user.id !== userId && !ctx.user.isAdmin) {
          throw new ForbiddenError('Cannot subscribe to other users');
        }
        // Filter at subscribe time
        return pubsub.subscribe('order:created', (event) => event.userId === userId);
      },
      resolve: (event) => event, // Map event payload to schema type
    },
  },
  Mutation: {
    createOrder: async (_, { input }, ctx) => {
      const order = await ctx.services.orders.create(input);
      // Publish event after mutation
      pubsub.publish('order:created', { orderId: order.id, userId: order.userId });
      return order;
    },
  },
};
```

## Scaling Patterns

### Horizontal Scaling with External PubSub

```typescript
// Redis-backed PubSub (scales across server instances)
import { RedisPubSub } from 'graphql-redis-subscriptions';
import Redis from 'ioredis';

const pubsub = new RedisPubSub({
  publisher: new Redis(REDIS_URL),
  subscriber: new Redis(REDIS_URL),
});
```

### Connection Management

```typescript
// graphql-ws server with connection lifecycle hooks
import { useServer } from 'graphql-ws/lib/use/ws';

useServer({
  schema,
  context: async (ctx) => {
    // Authenticate on connection
    const token = ctx.connectionParams?.authToken;
    const user = await validateToken(token);
    if (!user) throw new Error('Unauthorized');
    return { user };
  },
  onConnect: async (ctx) => {
    // Rate limit connections per IP
    const allowed = await rateLimiter.check(ctx.extra.request.socket.remoteAddress);
    if (!allowed) return false;
  },
  onSubscribe: (ctx, msg) => {
    // Limit active subscriptions per connection
    if (ctx.subscriptions.size >= MAX_SUBSCRIPTIONS_PER_CONNECTION) {
      return [{ message: 'Too many subscriptions' }];
    }
  },
  onDisconnect: (ctx) => {
    // Clean up resources
    cleanupUserPresence(ctx.user?.id);
  },
}, wsServer);
```

## SSE Alternative (simpler)

```typescript
// GraphQL Yoga / Apollo supports SSE natively
// Client uses EventSource or fetch with streaming
// No WebSocket upgrade needed, works through all proxies/CDNs

// Schema identical -- transport is configuration, not schema concern
type Subscription {
  notifications(userId: ID!): Notification!
}
```

## Anti-Patterns

- In-memory PubSub in production (loses events on deploy, doesn't scale horizontally)
- Publishing inside database transaction (publish AFTER commit)
- No event filtering (broadcasting all events to all subscribers = O(clients * events))
- Missing connection timeout (dead connections leak memory/connections)
- Subscription returning full entity on every field change (send only changed fields or delta)

## Verification

- [ ] WebSocket connections authenticated before subscription accepted
- [ ] PubSub backend is external (Redis/Kafka/NATS) not in-memory
- [ ] Events filtered server-side (not client-side discard)
- [ ] Connection limit per IP/client enforced
- [ ] Keep-alive pings active, dead connections cleaned up
- [ ] Load test: 1000 concurrent subscriptions, events delivered <100ms
- [ ] Reconnection tested: client reconnects, receives missed events (if applicable)
- [ ] Unsubscribe properly frees server resources (no memory leak under churn)
