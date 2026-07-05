# Connection Pooling

PgBouncer, ProxySQL, HikariCP, and pgx pool: sizing, modes, and operational guidance.

## Why Pool

- Database connections are expensive: ~2MB RAM per PostgreSQL connection, fork cost
- Most apps need 5-20 active connections, not 200 idle ones
- Pool multiplexes many app connections over fewer DB connections

## Pool Sizing Formula

```
Optimal pool size = ((core_count * 2) + effective_spindle_count)
```

- For SSD: effective_spindle_count ~ 1 (parallel I/O handled by controller)
- 4-core server with SSD: (4*2)+1 = 9 connections
- This is database-side max; application pool can be larger (queuing)
- Larger pool != better performance; contention increases with connections

### Real-World Sizing
| App Instances | Pool per Instance | DB max_connections | PgBouncer pool_size |
|---------------|-------------------|--------------------|---------------------|
| 4 pods | 10 each | 100 | 40 (10 per instance) |
| 20 pods | 5 each | 150 | 100 active, 50 reserve |
| Serverless (Lambda) | 1 each | 200 | Use RDS Proxy or PgBouncer |

## PgBouncer (PostgreSQL)

### Modes
| Mode | Behavior | Use When |
|------|----------|----------|
| Transaction | Connection returned after each transaction | Default. Best multiplexing |
| Session | Connection held for entire client session | Need prepared statements, LISTEN/NOTIFY |
| Statement | Connection returned after each statement | Extreme multiplexing, no multi-statement transactions |

### Configuration
```ini
[databases]
app = host=primary.db port=5432 dbname=app

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000        # app connections (generous)
default_pool_size = 20        # actual DB connections per database/user pair
reserve_pool_size = 5         # overflow for spikes
reserve_pool_timeout = 3      # seconds before using reserve
server_idle_timeout = 300     # close idle server connections after 5m
server_lifetime = 3600        # max age of server connection
log_connections = 0           # reduce noise in production
```

### Transaction Mode Limitations
- No `SET` commands (use `SET LOCAL` within transaction)
- No prepared statements (use `server_reset_query = DISCARD ALL`)
- No advisory locks that span transactions
- No `LISTEN/NOTIFY` (need session mode for that)

## ProxySQL (MySQL)

```sql
-- Connection pool per hostgroup
UPDATE mysql_servers SET max_connections=100 WHERE hostgroup_id=10;
UPDATE mysql_servers SET max_connections=200 WHERE hostgroup_id=20;

-- Connection multiplexing
UPDATE global_variables SET variable_value='true'
WHERE variable_name='mysql-multiplexing';
```

### Hostgroup Routing
- Hostgroup 10: writer (primary)
- Hostgroup 20: readers (replicas)
- Query rules route SELECT to readers, everything else to writer

## HikariCP (JVM)

```yaml
# application.yml (Spring Boot)
spring:
  datasource:
    hikari:
      maximum-pool-size: 10          # Start small
      minimum-idle: 5                # Keep 5 warm
      connection-timeout: 30000      # Wait 30s for connection
      idle-timeout: 600000           # Close idle after 10m
      max-lifetime: 1800000          # Recycle after 30m
      leak-detection-threshold: 60000  # Log if held >60s
```

Key rules:
- `maximumPoolSize` should be (2 * CPU cores) + 1 for typical workloads
- Set `maxLifetime` less than database's `wait_timeout` (MySQL) or `idle_in_transaction_session_timeout` (PG)
- Always enable leak detection in development/staging

## pgx Pool (Go)

```go
config, _ := pgxpool.ParseConfig(databaseURL)
config.MaxConns = 10
config.MinConns = 5
config.MaxConnLifetime = 30 * time.Minute
config.MaxConnIdleTime = 5 * time.Minute
config.HealthCheckPeriod = 1 * time.Minute

pool, _ := pgxpool.NewWithConfig(ctx, config)
```

- pgx pool handles prepared statements transparently
- Use `pool.Acquire()` + defer `conn.Release()` for multi-statement operations
- `pool.Stat()` for monitoring: `AcquiredConns()`, `TotalConns()`, `IdleConns()`

## Monitoring

Key metrics to track:
- Active connections (should rarely hit max)
- Waiting requests (queue depth; >0 sustained = pool too small)
- Connection acquisition time (p99 should be <100ms)
- Idle connections (too many = pool oversized, wasting DB RAM)
- Connection errors (timeouts, refused)

## Anti-Patterns

- Setting pool size = max_connections (no room for admin, monitoring, migrations)
- No connection timeout (threads block forever waiting for pool)
- Pool per request in serverless (use external pooler: RDS Proxy, Neon, PgBouncer)
- Holding connections during non-DB work (HTTP calls, file I/O inside transaction)
- Not setting max_lifetime (stale connections after DB failover)
