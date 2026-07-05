---
type: subskill
title: "OAuth & OpenID Connect"
---

# OAuth & OpenID Connect

## Core Concepts
- OAuth 2.0 is an authorization framework; OIDC adds authentication on top via ID tokens
- Authorization Code + PKCE is the recommended flow for all clients (public and confidential)
- Tokens: access token (short-lived, resource access), refresh token (long-lived, token renewal), ID token (user identity claims)
- Scopes define permission boundaries; claims carry identity attributes
- Token introspection vs local JWT validation tradeoffs (network call vs key rotation lag)

## Key Practices
- Always use PKCE even for confidential clients - defense in depth against code interception
- Store tokens server-side or in secure HTTP-only cookies; never in localStorage
- Validate `iss`, `aud`, `exp`, `nbf` claims on every token consumption
- Implement token rotation for refresh tokens - detect reuse as compromise signal
- Use short access token lifetimes (5-15min) paired with silent refresh

## Common Mistakes
- Treating the access token as proof of identity instead of using the ID token
- Skipping `state` or `nonce` validation, enabling CSRF and replay attacks
- Using Implicit flow in new applications (deprecated in OAuth 2.1)

## When to Apply
- Implementing SSO, third-party login, or API authorization
- Designing token exchange between microservices (on-behalf-of flows)
- Reviewing auth integrations with identity providers (Okta, Auth0, Entra ID)
