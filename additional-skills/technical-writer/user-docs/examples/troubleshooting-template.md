---
type: example
title: "Troubleshooting: Task API"
---

# Troubleshooting: Task API

Solutions for common issues when working with the Task API.

## Authentication Errors

### 401 Unauthorized: "Bearer token is expired"

**Symptom:** API returns 401 with message "Bearer token is expired"

**Cause:** JWT tokens expire after 1 hour by default.

**Fix:**
1. Request a new token from `POST /auth/token`.
2. Update your `Authorization` header with the new token.
3. For long-running applications, implement token refresh logic:
   ```javascript
   // Refresh 5 minutes before expiry
   const refreshBuffer = 5 * 60 * 1000;
   setTimeout(refreshToken, tokenExpiresIn - refreshBuffer);
   ```

**Prevention:** Implement automatic token refresh in your SDK client initialization.

---

### 401 Unauthorized: "Invalid signature"

**Symptom:** API returns 401 with message "Invalid signature" immediately after generating a new token.

**Cause:** Clock skew between your server and the auth server, or using a token generated for a different environment.

**Fix:**
1. Verify you are using the correct environment:
   - Production tokens work only with `api.example.com`
   - Sandbox tokens work only with `sandbox.api.example.com`
2. Check your server clock: `date -u` should match UTC within 30 seconds.
3. If clock is off, sync with NTP: `sudo ntpdate pool.ntp.org`

---

## Rate Limiting

### 429 Too Many Requests

**Symptom:** API returns 429 with `Retry-After` header.

**Cause:** You exceeded your plan's rate limit.

**Fix:**
1. Check the `Retry-After` header for seconds to wait.
2. Implement exponential backoff:
   ```javascript
   async function requestWithRetry(fn, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await fn();
       } catch (err) {
         if (err.status === 429) {
           const delay = err.headers['retry-after'] * 1000 || (2 ** i) * 1000;
           await new Promise(r => setTimeout(r, delay));
         } else throw err;
       }
     }
   }
   ```
3. If sustained, consider upgrading your plan or batching requests.

**Prevention:**
- Monitor `X-RateLimit-Remaining` header on every response
- Implement client-side rate limiting to stay under thresholds
- Use bulk endpoints instead of individual calls where available

---

## Pagination Issues

### Duplicate results between pages

**Symptom:** The same task appears on both page 1 and page 2.

**Cause:** Items were created or reordered between page requests when using timestamp-based cursors.

**Fix:**
1. Use the `cursor` value from the previous response (not a manually constructed one).
2. Do not cache cursors -- they may expire or become invalid.
3. If you need a consistent snapshot, use the `GET /tasks/export` endpoint instead.

---

### Cursor expired or invalid

**Symptom:** API returns 400 with "Invalid cursor" error.

**Cause:** Cursors expire after 10 minutes or become invalid after data changes.

**Fix:**
1. Start pagination from the beginning (omit the `cursor` parameter).
2. Complete pagination within 10 minutes for consistent results.
3. For large datasets, use smaller page sizes to complete faster.

---

## Webhook Issues

### Webhooks not receiving events

**Symptom:** You registered a webhook but events never arrive at your endpoint.

**Diagnosis:**
1. Check webhook status: `GET /webhooks/{id}` -- is `active: true`?
2. Check delivery logs: `GET /webhooks/{id}/deliveries` -- any failures?
3. Verify your endpoint is publicly accessible (not localhost).

**Common causes and fixes:**

| Cause | Fix |
|-------|-----|
| Endpoint not reachable | Verify URL is publicly accessible (use ngrok for local dev) |
| SSL certificate invalid | Ensure valid, non-expired certificate |
| Endpoint returning non-2xx | Your endpoint must return 200-299 status code |
| Firewall blocking | Allow incoming POST from our IP ranges (see [IP allowlist](/docs/reference/ip-ranges)) |

---

### Webhook signature verification failing

**Symptom:** Your signature verification rejects valid webhook payloads.

**Cause:** Raw body is being modified before verification (middleware parsing JSON first).

**Fix:**
1. Verify against the raw request body, not parsed JSON:
   ```javascript
   // Express: capture raw body BEFORE JSON parsing
   app.use('/webhooks', express.raw({ type: 'application/json' }));
   
   app.post('/webhooks/tasks', (req, res) => {
     const signature = req.headers['x-webhook-signature'];
     const isValid = verifySignature(req.body, signature, webhookSecret);
     // req.body is a Buffer here, not parsed JSON
   });
   ```
2. Ensure your secret matches what was provided during webhook registration.

---

## Connection Issues

### ECONNREFUSED / Connection timeout

**Symptom:** Cannot reach the API at all.

**Diagnosis:**
1. Check API status: visit [status.example.com](https://status.example.com)
2. Test connectivity: `curl -v https://api.example.com/health`
3. Check DNS: `nslookup api.example.com`

**Common causes and fixes:**

| Cause | Fix |
|-------|-----|
| DNS failure | Try `8.8.8.8` as DNS, or flush local cache |
| Corporate firewall | Request allowlist for `api.example.com` port 443 |
| Regional outage | Check status page for region-specific issues |
| Proxy misconfiguration | Set `HTTPS_PROXY` environment variable |

---

## Still stuck?

If your issue is not listed here:
1. Search the [community forum](https://community.example.com)
2. Check the [status page](https://status.example.com) for known incidents
3. Contact support with:
   - Your request ID (from `X-Request-ID` response header)
   - The exact error response body
   - Timestamp of the failed request (UTC)
