---
type: subskill
title: "Output Encoding"
---

# Output Encoding

## Core Concepts
- Output encoding transforms data to be safe for the target rendering context
- Context-specific: HTML body, HTML attributes, JavaScript, CSS, URLs each need different encoding
- Encoding is the primary defense against Cross-Site Scripting (XSS)
- Encoding preserves data meaning while neutralizing control characters for the context
- Defense in depth: combine encoding with Content-Security-Policy headers

## Key Practices
- Apply encoding at the point of output, not at input time (data may flow to multiple contexts)
- Use framework auto-encoding (React JSX, Go html/template) and understand its escape boundaries
- Explicitly encode when inserting into href/src attributes (JavaScript URI injection)
- Apply URL encoding for values placed in URL parameters or path segments
- Set `Content-Type` headers explicitly to prevent MIME sniffing reinterpretation

## Common Mistakes
- Using HTML entity encoding in a JavaScript context (different metacharacters)
- Marking user content as "safe" / `dangerouslySetInnerHTML` without sanitization
- Double-encoding data causing display corruption, then removing encoding entirely as "fix"

## When to Apply
- Rendering user-supplied data in web pages or emails
- Constructing dynamic SQL, shell commands, or LDAP queries (use parameterization instead)
- Building responses where user data appears in headers (header injection prevention)
