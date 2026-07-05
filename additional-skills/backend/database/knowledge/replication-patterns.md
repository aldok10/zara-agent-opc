# Replication Patterns

Topologies, trade-offs, and operational guidance for database replication.

## Synchronous Replication

```
Primary --sync--> Standby (commit waits for confirmation)
```

- Guarantees zero data loss (RPO=0)
- Adds latency to every write (network round-trip to standby)
- Use for: financial data, audit logs, anything where data loss is unacceptable
- PostgreSQL: `synchronous_commit = on`, `synchronous_standby_names = 'standby1'`
- Risk: standby failure blocks all writes unless `synchronous_commit = remote_apply` with fallback

## Asynchronous Replication

```
Primary --async--> Replica(s) (commit returns immediately)
```

- No write latency penalty
- Data loss window = replication lag (typically ms, can spike to seconds)
- Use for: read scaling, analytics replicas, geographic distribution
- Monitor lag: PG `pg_stat_replication.replay_lag`, MySQL `Seconds_Behind_Source`
- Application must tolerate stale reads or route time-sensitive reads to primary

## Semi-Synchronous (MySQL)

```
Primary --semi-sync--> at least 1 replica acknowledges
```

- Compromise: at least one replica has the data before commit returns
- Degrades to async if no replica available within timeout (`rpl_semi_sync_source_timeout`)
- Use for: important data with moderate latency tolerance

## Read Replicas

### Routing Strategy
```
Writes -> Primary
Reads  -> Replica(s) via load balancer

Rules:
1. After write, read from primary for session consistency (read-your-writes)
2. Set maximum acceptable lag threshold (e.g., 5s)
3. Remove lagging replicas from rotation automatically
4. Critical reads (auth, payments) always go to primary
```

### Implementation
- Application-level: connection routing in ORM/query builder
- Proxy-level: ProxySQL (MySQL), pgpool-II (PostgreSQL), HAProxy with health checks
- DNS-level: Route53 with health checks (coarse-grained)

## Streaming Replication (PostgreSQL)

```
WAL segments streamed continuously from primary to standby
```

- Physical replication: byte-for-byte copy, entire cluster
- Standby can serve read queries (`hot_standby = on`)
- Promotion: `pg_promote()` or `pg_ctl promote` for failover
- Cascading: Standby -> Standby (reduces primary I/O)
- Slots: `pg_replication_slots` prevent WAL recycling before replica catches up (but can fill disk!)

## Logical Replication (PostgreSQL 10+)

```
Primary --logical--> Subscriber (table-level, cross-version)
```

- Selective: replicate specific tables, not entire cluster
- Cross-version: PG 14 -> PG 16 for zero-downtime upgrades
- Supports transforms: different indexes, partitioning on subscriber
- Limitations: no sequences, no DDL replication, no large objects
- Use for: data warehouse feeds, version upgrades, selective sync

## Multi-Master / Active-Active

```
Node A <---> Node B (both accept writes)
```

- Conflict resolution required: last-write-wins, application-level merge, CRDT
- Technologies: MySQL Group Replication, Galera Cluster, CockroachDB, YugabyteDB
- Complexity is high; only use when geographic write locality is required
- Conflict categories: insert-insert (key collision), update-update (same row), delete-update

### Conflict Resolution Strategies
| Strategy | Trade-off |
|----------|-----------|
| Last-write-wins (timestamp) | Simple but loses data silently |
| Application-level merge | Complex but correct |
| CRDTs | Eventually consistent, limited data types |
| Region-based ownership | Partitions data, avoids conflicts |

## Failover

### Automated Failover Requirements
1. Failure detection (heartbeat timeout, typically 10-30s)
2. Fencing: prevent split-brain (STONITH, leader lease)
3. Promotion: replica becomes primary
4. Routing: update DNS/proxy/VIP to new primary
5. Catch-up: other replicas re-point to new primary

### Tools
- PostgreSQL: Patroni (etcd-based), repmgr, pg_auto_failover
- MySQL: MySQL InnoDB Cluster, Orchestrator, MHA
- Managed: RDS Multi-AZ, Cloud SQL HA, Atlas

## Operational Checklist

- [ ] Replication lag monitoring with alerting (>5s = page)
- [ ] Automated failover tested quarterly
- [ ] Replication slots have max_slot_wal_keep_size to prevent disk fill
- [ ] Cross-region replicas have compression enabled
- [ ] Application handles read-after-write consistency for user sessions
- [ ] Backup taken from replica (not primary) to avoid performance impact
