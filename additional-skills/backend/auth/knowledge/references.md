# References

## OAuth 2.1 & OIDC (8 refs)

- **OAuth 2.1 (draft)** -- https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-11 -- Consolidated OAuth specification
- **OpenID Connect Core** -- https://openid.net/specs/openid-connect-core-1_0.html -- Identity layer on OAuth 2.0
- **OAuth 2.0 Security BCP** -- https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics -- Current security best practices
- **PKCE (RFC 7636)** -- https://datatracker.ietf.org/doc/html/rfc7636 -- Proof Key for Code Exchange
- **Token Introspection (RFC 7662)** -- https://datatracker.ietf.org/doc/html/rfc7662 -- Token validation endpoint
- **Token Revocation (RFC 7009)** -- https://datatracker.ietf.org/doc/html/rfc7009 -- Token revocation endpoint
- **DPoP (RFC 9449)** -- https://datatracker.ietf.org/doc/html/rfc9449 -- Demonstrating Proof of Possession
- **OAuth for Browser-Based Apps** -- https://datatracker.ietf.org/doc/html/draft-ietf-oauth-browser-based-apps -- SPA guidance

## WebAuthn & Passkeys (6 refs)

- **WebAuthn Specification** -- https://www.w3.org/TR/webauthn-3/ -- W3C Web Authentication standard
- **Passkeys.dev** -- https://passkeys.dev/ -- Implementation guide for passkeys
- **FIDO2 Overview** -- https://fidoalliance.org/fido2/ -- FIDO Alliance protocol overview
- **SimpleWebAuthn** -- https://simplewebauthn.dev/docs/ -- TypeScript WebAuthn library
- **passkey-rs** -- https://docs.rs/webauthn-rs/latest/webauthn_rs/ -- Rust WebAuthn implementation
- **Apple Passkeys** -- https://developer.apple.com/passkeys/ -- Platform integration guide

## JWT & Token Security (6 refs)

- **JWT (RFC 7519)** -- https://datatracker.ietf.org/doc/html/rfc7519 -- JSON Web Token specification
- **JWS (RFC 7515)** -- https://datatracker.ietf.org/doc/html/rfc7515 -- JSON Web Signature
- **JWT Best Practices (RFC 8725)** -- https://datatracker.ietf.org/doc/html/rfc8725 -- Implementation requirements
- **jose** -- https://github.com/panva/jose -- JavaScript JWT/JWS/JWE library
- **JWT.io** -- https://jwt.io/ -- JWT debugger and library directory
- **Attacking JWTs** -- https://portswigger.net/web-security/jwt -- Common JWT vulnerabilities

## Session Management (5 refs)

- **OWASP Session Management** -- https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html -- Session security checklist
- **Cookie Security** -- https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies -- Secure cookie attributes
- **Redis Sessions** -- https://redis.io/docs/manual/patterns/ -- Server-side session storage
- **Session Fixation** -- https://owasp.org/www-community/attacks/Session_fixation -- Attack prevention
- **SameSite Cookies** -- https://web.dev/articles/samesite-cookies-explained -- Cross-site request protection

## Identity Providers (5 refs)

- **Keycloak** -- https://www.keycloak.org/documentation -- Open-source identity and access management
- **Auth0 Docs** -- https://auth0.com/docs -- Managed identity platform
- **Ory** -- https://www.ory.sh/docs/ -- Open-source identity infrastructure
- **Authelia** -- https://www.authelia.com/configuration/ -- Self-hosted SSO portal
- **Zitadel** -- https://zitadel.com/docs -- Cloud-native identity management

## Authorization (6 refs)

- **OWASP Authorization** -- https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html -- Authorization patterns
- **OpenFGA** -- https://openfga.dev/docs -- Relationship-based access control
- **Cedar** -- https://www.cedarpolicy.com/en -- Policy language from AWS (Verified Permissions)
- **OPA (Open Policy Agent)** -- https://www.openpolicyagent.org/docs/latest/ -- Policy engine with Rego
- **Casbin** -- https://casbin.org/docs/overview -- Multi-model authorization library
- **RBAC vs ABAC vs ReBAC** -- https://www.osohq.com/post/rbac-abac-rebac -- Access control model comparison

## Multi-Factor Authentication (4 refs)

- **TOTP (RFC 6238)** -- https://datatracker.ietf.org/doc/html/rfc6238 -- Time-based one-time passwords
- **OWASP MFA** -- https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html -- MFA implementation guide
- **WebOTP API** -- https://developer.mozilla.org/en-US/docs/Web/API/WebOTP_API -- Browser OTP autofill
- **Twilio Verify** -- https://www.twilio.com/docs/verify -- SMS/email verification service

## Password Security (4 refs)

- **OWASP Password Storage** -- https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html -- Hashing best practices
- **Argon2** -- https://github.com/P-H-C/phc-winner-argon2 -- Password hashing competition winner
- **Have I Been Pwned API** -- https://haveibeenpwned.com/API/v3 -- Breached password checking
- **NIST SP 800-63B** -- https://pages.nist.gov/800-63-3/sp800-63b.html -- Digital identity authentication guidelines

## Security Headers & Transport (4 refs)

- **HSTS** -- https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security -- Force HTTPS
- **CSP** -- https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP -- Content Security Policy
- **CORS Security** -- https://portswigger.net/web-security/cors -- Cross-origin misconfigurations
- **mTLS** -- https://www.cloudflare.com/learning/access-management/what-is-mutual-tls/ -- Mutual TLS authentication
