---
type: subskill
title: "Session Management"
---

# Session Management

## Context

Sessions maintain authenticated state between requests. Cookie-based sessions remain the most secure option for browser-based apps. Design for revocability, multi-device support, and graceful expiry.

## Rules

1. Session cookies: `HttpOnly`, `Secure`, `SameSite=Lax` minimum; `Strict` for sensitive operations
2. Session ID: cryptographically random, minimum 128 bits entropy, opaque (not JWT, not sequential)
3. Regenerate session ID after authentication state change (login, privilege escalation, password change)
4. Sliding expiry: extend on activity, absolute maximum lifetime regardless (e.g., sliding=30min, absolute=8hr)
5. Server-side session store is mandatory for revocable sessions  -  Redis, DynamoDB, or database with TTL
6. Multi-device: each device gets independent session; list active sessions for user, allow selective revocation
7. CSRF protection: SameSite + synchronizer token pattern for state-changing operations; double-submit cookie as fallback
8. Session data: store minimal server-side (user_id, device_id, created_at, last_active, ip_hash); not user profile
9. Idle timeout: revoke after configurable inactivity (default 30min); distinguish from absolute expiry
10. Logout: invalidate server-side immediately, clear cookie with `Max-Age=0`, revoke associated tokens
11. Rate limit session creation per user to prevent session flooding attacks

## Architecture

### Cookie Configuration
```
Set-Cookie: sid=<random>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=1800; Domain=.example.com
```

### Session Store Schema
```
session_id: string (primary key, indexed)
user_id: string (indexed for multi-device queries)
device_fingerprint: string (hashed)
created_at: timestamp
last_active: timestamp
expires_at: timestamp (absolute)
ip_hash: string (detect suspicious location change)
metadata: {user_agent, geo_region}
```

### Revocation Patterns
```
Single session: DELETE from store by session_id
All user sessions: DELETE by user_id (password change, account compromise)
Selective: present active sessions, user picks which to revoke
Forced: admin revokes all sessions for a user (security incident)
```

## Sliding vs Absolute Expiry

| Type | Purpose | Typical Value |
|------|---------|---------------|
| Sliding | Extend on activity | 15-30 minutes |
| Absolute | Maximum session life | 4-8 hours (web), 30 days (mobile remember-me) |
| Idle | Revoke on inactivity | Same as sliding |
| Refresh | Re-authenticate without full login | Via remember-me cookie + step-up |

## Anti-Patterns

- Storing session ID in localStorage (XSS exfiltration)
- Using JWT as session token without revocation mechanism (logout doesn't work)
- Session fixation: accepting session ID from URL parameter or client
- No absolute timeout: sliding-only means eternal sessions
- Shared session across browser tabs via broadcast without isolation option
- Storing full user object in session store (stale data, bloated store)

## Multi-Device Strategy

- Each login creates new session with device metadata
- User can view: device type, last active, approximate location, session age
- "Sign out everywhere" = bulk revoke by user_id
- Remember-me: long-lived, low-privilege token that bootstraps new session with step-up
- Push notification to existing sessions on new device login (anomaly detection)

## Verification

- Session cookie not accessible via JavaScript (`document.cookie` returns nothing)
- Session regenerated after login (old session ID invalid)
- Idle timeout revokes session after inactivity window
- Absolute timeout enforced even with continuous activity
- Logout clears server state immediately (old session ID returns 401)
- CSRF token mismatch blocks state-changing requests
