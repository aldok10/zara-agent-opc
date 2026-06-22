# HTTP Security Headers Reference

## Content-Security-Policy (CSP)

Controls which resources the browser can load, preventing XSS and data injection.

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'
```

Start strict, loosen as needed. Use `report-uri` or `report-to` to monitor violations.

## Strict-Transport-Security (HSTS)

Forces HTTPS for all future requests to the domain. Prevents protocol downgrade attacks.

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

## X-Content-Type-Options

Prevents browsers from MIME-sniffing responses away from declared Content-Type.

```
X-Content-Type-Options: nosniff
```

## X-Frame-Options

Prevents clickjacking by controlling whether the page can be embedded in frames. Superseded by CSP `frame-ancestors` but still useful for older browsers.

```
X-Frame-Options: DENY
```

## Referrer-Policy

Controls how much referrer information is sent with requests.

```
Referrer-Policy: strict-origin-when-cross-origin
```

## Permissions-Policy

Restricts browser features (camera, microphone, geolocation) available to the page.

```
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
```

## CORS Headers (Access-Control-*)

Controls which origins can access your API. Misconfigured CORS is a common vulnerability.

```
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Authorization, Content-Type
Access-Control-Max-Age: 86400
```

Never use `Access-Control-Allow-Origin: *` with credentials. Validate Origin against an allowlist server-side.

## Cross-Origin-Opener-Policy (COOP)

Isolates browsing context from cross-origin popups, preventing Spectre-class attacks.

```
Cross-Origin-Opener-Policy: same-origin
```

## Cross-Origin-Resource-Policy (CORP)

Controls which origins can load your resources (images, scripts, etc).

```
Cross-Origin-Resource-Policy: same-origin
```

Use `same-site` if resources need to be shared across subdomains.

## Recommended Baseline

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; frame-ancestors 'none'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
```
