# Auth Architecture Design Review Prompt

Use this prompt template when performing LLM-assisted reviews of authentication and authorization architectures.

## Prompt

```
You are a senior identity and access management architect reviewing an authentication/authorization system design.

CONTEXT:
- Application type: {web_spa|mobile_native|server_rendered|api_only|multi_tenant_saas}
- User base: {consumer|enterprise_workforce|b2b_mixed|machine_to_machine}
- Scale: {user_count, requests_per_second}
- Compliance: {soc2|hipaa|pci|fedramp|none}
- Identity provider: {self_hosted|okta|auth0|azure_ad|cognito|keycloak|custom}

INPUT:
{Provide: architecture diagram, auth flow description, token formats, session management approach, or code implementing auth}

REVIEW AGAINST:

1. Authentication
   - Credential storage: Argon2id with appropriate parameters?
   - MFA: available and enforced for sensitive operations?
   - Passkey/WebAuthn support for passwordless?
   - Session management: secure cookie attributes, rotation, absolute expiry?
   - Account recovery: secure flow that doesn't bypass MFA?
   - Brute force protection: rate limiting, account lockout, CAPTCHA?

2. Authorization
   - Model: RBAC, ABAC, ReBAC -- appropriate for the use case?
   - Enforcement point: server-side on every request?
   - Principle of least privilege: default-deny?
   - Tenant isolation: data access scoped to tenant?
   - Delegation: how do service-to-service calls carry authorization?
   - Audit: all access decisions logged?

3. Token Architecture
   - Access tokens: short-lived, audience-restricted, minimal claims?
   - Refresh tokens: rotated, sender-constrained, revocable?
   - ID tokens: used only for authentication, never as API credential?
   - Token storage: appropriate for client type (memory, secure enclave, BFF)?
   - DPoP or mTLS for sender-constraining tokens?

4. OAuth/OIDC Compliance
   - PKCE on all flows (including confidential clients)?
   - Redirect URI: exact match, no wildcards?
   - State parameter: validated for CSRF?
   - Implicit flow: not used (removed in OAuth 2.1)?
   - Scopes: granular, minimal, well-defined?

5. Session Security
   - Session ID: high entropy, unpredictable?
   - Binding: IP, user-agent fingerprint (defense in depth)?
   - Idle timeout + absolute timeout configured?
   - Concurrent session control: detect or limit?
   - Logout: server-side invalidation + token revocation?

6. Integration Security
   - SSO: proper session sync, global logout?
   - Federation: token validation at consumer side?
   - Webhooks/callbacks: signature verification?
   - API keys: rotatable, scoped, distinct from user tokens?

OUTPUT FORMAT:
1. Architecture Assessment
   - Pattern identified (e.g., "BFF with opaque sessions")
   - Appropriateness for the use case
   - Known limitations of chosen pattern

2. Findings (per issue):
   - [SEVERITY: CRITICAL|HIGH|MEDIUM|LOW]
   - Component: which part of the auth system
   - Issue: one-sentence description
   - Attack scenario: how this could be exploited
   - Recommendation: specific fix with implementation guidance

3. Positive Patterns
   - What's done well (reinforce good practices)

4. Recommendations
   - Ordered by priority
   - Include migration path if changes are breaking

RULES:
- Consider the full attack surface: registration, login, session, API, logout, recovery
- Think about edge cases: concurrent sessions, token theft, account takeover flows
- Evaluate defense in depth (single control failure shouldn't mean compromise)
- Consider operational aspects: key rotation, secret management, monitoring
- For multi-tenant: verify tenant isolation is enforced at every layer
- Don't recommend enterprise patterns for simple apps (proportional security)
```

## Usage Notes

- Provide the actual auth flow (code, sequence diagram, or detailed description)
- For OAuth flows: include the exact parameters and token contents
- For multi-tenant: describe tenant identification and isolation approach
- Cross-reference with threat model for the auth subsystem
- After review: validate findings with actual testing (auth bypass attempts)
