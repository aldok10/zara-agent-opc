# OWASP API Security Top 10 (2023)

Source: https://owasp.org/API-Security/editions/2023/en/0x00-toc/

## API1:2023 Broken Object Level Authorization (BOLA)

APIs expose endpoints handling object identifiers, creating a wide attack surface. Attackers manipulate IDs in requests to access other users' data. Most common and damaging API vulnerability.

**Prevention:**
- Implement authorization checks for every function that accesses a data source using user input
- Use random, unpredictable GUIDs instead of sequential numeric IDs
- Write tests to evaluate authorization mechanism for every endpoint
- Enforce record ownership at the data layer

```python
# Bad: no ownership check
@app.get("/api/orders/{order_id}")
def get_order(order_id):
    return db.orders.find(order_id)

# Good: verify ownership
@app.get("/api/orders/{order_id}")
def get_order(order_id, current_user=Depends(get_current_user)):
    order = db.orders.find(order_id)
    if order.user_id != current_user.id:
        raise HTTPException(403)
    return order
```

## API2:2023 Broken Authentication

Authentication mechanisms are complex targets. Attackers exploit weak token generation, missing rate limits, or credential stuffing to impersonate other users.

**Prevention:**
- Use standard authentication protocols (OAuth 2.0, OpenID Connect)
- Implement rate limiting and account lockout on auth endpoints
- Use short-lived tokens with proper rotation
- Enforce multi-factor authentication for sensitive operations

```
# Rate limit login endpoint
POST /auth/login  -> max 5 attempts per minute per IP
# Use short-lived JWTs
Authorization: Bearer <token with 15min expiry + refresh token rotation>
```

## API3:2023 Broken Object Property Level Authorization

APIs exposing all object properties without filtering allow attackers to read sensitive fields or mass-assign writable properties they shouldn't control (combines old Mass Assignment + Excessive Data Exposure).

**Prevention:**
- Never rely on client to filter response properties
- Define explicit allow-lists for writable fields per endpoint
- Return only properties the client needs for that specific use case
- Validate and whitelist input properties on write operations

```javascript
// Bad: returns all user fields
app.get('/api/users/:id', (req, res) => res.json(user));

// Good: explicit projection
app.get('/api/users/:id', (req, res) => {
  res.json({ id: user.id, name: user.name, email: user.email });
});
```

## API4:2023 Unrestricted Resource Consumption

APIs that don't limit request size, frequency, or cost of operations enable denial-of-service and unexpected billing. Attackers exploit missing rate limits, unbounded queries, or expensive operations.

**Prevention:**
- Implement rate limiting per client/IP with proper HTTP 429 responses
- Set maximum request payload size and query complexity limits
- Limit pagination size (max items per page)
- Set timeouts and resource quotas for downstream operations

```nginx
# Nginx rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;
location /api/ {
    limit_req zone=api burst=20 nodelay;
    client_max_body_size 1m;
}
```

## API5:2023 Broken Function Level Authorization

Attackers find and call administrative or privileged endpoints by guessing URL patterns (e.g., changing /users to /admins, or GET to DELETE). Different roles accessing the same resource with different functions.

**Prevention:**
- Deny all access by default, require explicit grants per role
- Ensure admin functions enforce role checks separate from regular endpoints
- Don't rely on client-side hiding of admin functions
- Test authorization for every HTTP method on every endpoint

```python
@app.delete("/api/users/{user_id}")
@require_role("admin")  # Explicit role check, not just authenticated
def delete_user(user_id, current_user=Depends(get_current_user)):
    ...
```

## API6:2023 Unrestricted Access to Sensitive Business Flows

Attackers automate access to business flows (buying, posting, reservations) at scale, harming the business without exploiting technical bugs. The API makes it easy to script what should require human interaction.

**Prevention:**
- Identify business flows at risk of automated abuse
- Implement device fingerprinting, CAPTCHA, or proof-of-work for sensitive flows
- Detect non-human patterns (speed, volume, geographic anomalies)
- Implement business-layer rate limits (e.g., max 2 ticket purchases per user per event)

## API7:2023 Server Side Request Forgery (SSRF)

When an API fetches remote resources based on user-supplied URLs without validation, attackers can force the server to make requests to internal services, cloud metadata endpoints, or arbitrary external systems.

**Prevention:**
- Validate and sanitize all user-supplied URLs against an allowlist
- Block requests to private/internal IP ranges (10.x, 172.16.x, 169.254.x, 127.x)
- Disable HTTP redirects or re-validate after redirect
- Don't send raw responses from fetched resources back to clients

```python
import ipaddress
def is_safe_url(url):
    hostname = urlparse(url).hostname
    ip = socket.gethostbyname(hostname)
    return ipaddress.ip_address(ip).is_global
```

## API8:2023 Security Misconfiguration

Missing security hardening, default credentials, open cloud storage, verbose error messages, unnecessary HTTP methods enabled, missing TLS, or permissive CORS policies.

**Prevention:**
- Automate hardening and configuration validation in CI/CD
- Disable unnecessary HTTP methods, debug endpoints, and default accounts
- Ensure error messages don't leak stack traces or internal details
- Define and enforce CORS policies, security headers, and TLS requirements

## API9:2023 Improper Inventory Management

Organizations lose track of API versions, deprecated endpoints, and exposed debug/staging environments. Old, unpatched API versions remain accessible and attackable.

**Prevention:**
- Maintain a complete inventory of all API hosts and versions
- Decommission old API versions with clear deprecation timelines
- Restrict access to non-production environments (VPN, IP allowlist)
- Apply same security controls to all environments serving real data

## API10:2023 Unsafe Consumption of APIs

APIs that integrate with third-party services without validating their responses, applying rate limits, or using secure transport. Attackers compromise the third-party to pivot into your system.

**Prevention:**
- Validate and sanitize all data received from third-party APIs
- Use TLS for all integrations, verify certificates
- Apply timeouts and circuit breakers to external calls
- Don't blindly trust data from integrated services, even "trusted" partners

```python
# Bad: trusting third-party response
data = requests.get(partner_api).json()
db.execute(f"INSERT INTO orders VALUES ('{data['id']}')")

# Good: validate + parameterize
data = requests.get(partner_api, timeout=5, verify=True).json()
validated = OrderSchema().load(data)  # schema validation
db.execute("INSERT INTO orders VALUES (?)", (validated['id'],))
```
