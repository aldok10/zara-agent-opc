# Troubleshooting Documentation

Symptom-cause-fix guides, decision trees, and error code reference for debugging support.

## When to Load

- Writing troubleshooting guides for common issues
- Designing error code systems with actionable messages
- Reducing support ticket volume through self-service docs
- Converting support patterns into structured documentation

## Key Concepts

**Symptom-Cause-Fix** -- Structure: What the user sees (symptom), why it happens (cause), how to resolve it (fix). Users search by symptom, not by cause.

**Decision Trees** -- Branching logic for diagnosis: "Do you see error A or error B?" Guide users through elimination. Works well for issues with multiple possible causes.

**Error Codes** -- Machine-readable identifiers (ERR_AUTH_001, E4021) with human-readable descriptions. Enable: searchable docs, support ticket correlation, telemetry grouping.

**Searchability** -- Include the exact error message text users will copy-paste into search. Match their language, not internal terminology.

**Self-resolution Rate** -- Track what percentage of users resolve issues without contacting support. Optimize for this metric.

## Patterns

```markdown
# Connection Refused (ECONNREFUSED)

## Symptom
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

## Possible Causes

### 1. Database not running
**Check**: `pg_isready -h localhost -p 5432`
**Fix**: Start PostgreSQL:
- macOS: `brew services start postgresql@16`
- Linux: `sudo systemctl start postgresql`
- Docker: `docker start postgres-container`

### 2. Wrong port
**Check**: `grep port /etc/postgresql/16/main/postgresql.conf`
**Fix**: Update your connection string to use the correct port.

### 3. Firewall blocking
**Check**: `sudo lsof -i :5432`
**Fix**: Allow the port through your firewall or security group.

## Still stuck?
[Open a support ticket](https://support.example.com) with:
- Output of `pg_isready`
- Your connection string (redact password)
- OS and PostgreSQL version
```

```markdown
# Error Code Reference

| Code | Message | Cause | Resolution |
|------|---------|-------|------------|
| E1001 | Rate limit exceeded | Too many requests in window | Implement backoff; check `Retry-After` header |
| E2001 | Invalid payload | Request body fails validation | Check `errors` array for field-level details |
| E3001 | Insufficient permissions | Token lacks required scope | Request additional scopes in OAuth flow |
| E4001 | Resource not found | ID does not exist or was deleted | Verify ID; check if soft-deleted |
```

## Gotchas

- Writing causes without symptoms forces users to understand the system to find the fix
- Generic advice ("check your configuration") without specific commands wastes time
- Error messages that say what went wrong but not what to do next are incomplete
- Troubleshooting docs that only cover the happy path miss the point entirely
- Not including the exact error text (copy-pasteable) makes the page unfindable via search

## Verification

- Every entry includes the exact error message or symptom users would see
- Fixes include specific commands, not just descriptions of what to do
- Decision tree paths all terminate in either a resolution or an escalation path
- Error codes are searchable in documentation search (test with the code itself)
- Top 10 support tickets have corresponding troubleshooting entries
