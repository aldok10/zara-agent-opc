---
type: subskill
title: "Session Management"
---

# Session Management

## Core Concepts
- Sessions bind authenticated identity to stateless HTTP; server-side state or signed tokens
- Session ID must be cryptographically random (128+ bits entropy), unpredictable
- Session lifecycle: creation → validation → renewal → invalidation
- Binding sessions to client properties (IP, user-agent fingerprint) adds defense layers
- Concurrent session policies control how many active sessions a user may hold

## Key Practices
- Regenerate session ID after authentication to prevent session fixation
- Set cookies with `Secure`, `HttpOnly`, `SameSite=Strict` (or `Lax` where needed)
- Implement absolute timeout (max lifetime) and idle timeout (inactivity expiry)
- Provide explicit logout that invalidates server-side session state
- Store session data server-side; cookie holds only the opaque session ID

## Common Mistakes
- Relying solely on cookie expiration without server-side invalidation
- Accepting session IDs from URL parameters or POST bodies (fixation vector)
- Not invalidating all sessions on password change or account compromise

## When to Apply
- Building login/logout flows for web applications
- Implementing "remember me" functionality with appropriate security tradeoffs
- Reviewing session handling for compliance requirements (PCI-DSS, SOC2)
