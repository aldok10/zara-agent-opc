# X.509 Certificates

Certificate lifecycle, chain of trust, Certificate Transparency, OCSP, and CRL management.

## When to Load

- Setting up TLS certificates for services
- Implementing mTLS between microservices
- Troubleshooting certificate chain validation failures
- Designing internal PKI for service-to-service authentication

## Key Concepts

**Certificate Chain of Trust**
```
Root CA (self-signed, stored in trust stores)
  |
  v
Intermediate CA (signed by Root, signs leaf certs)
  |
  v
Leaf Certificate (your server/service cert)
```
- Root CAs are pre-installed in OS/browser trust stores
- Intermediate CAs limit blast radius if compromised
- Leaf certs should be short-lived (90 days or less)
- Server must send full chain (leaf + intermediates), NOT the root

**Certificate Contents**
- Subject: CN (Common Name) and SANs (Subject Alternative Names)
- Issuer: who signed this certificate
- Validity: notBefore and notAfter dates
- Public key: the key being certified
- Extensions: key usage, basic constraints, CRL/OCSP endpoints
- SANs are authoritative for identity -- CN is legacy/deprecated for HTTPS

**Certificate Transparency (CT)**
- All publicly-trusted certs must be logged to CT logs
- Enables detection of misissued certificates
- Monitors can watch for unauthorized certs for your domain
- SCT (Signed Certificate Timestamp) proves log inclusion

**Revocation Methods**
- CRL (Certificate Revocation List): periodic download, can be stale
- OCSP (Online Certificate Status Protocol): real-time check per cert
- OCSP Stapling: server fetches OCSP response, sends with TLS handshake
- CRLite: compressed bloom filter approach (Firefox)
- Short-lived certs: don't revoke, just don't renew (best approach)

## Patterns

```bash
# Generate internal CA + service certificate with openssl
# Root CA (do once, store securely)
openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:P-256 \
  -days 3650 -nodes -keyout ca.key -out ca.crt \
  -subj "/CN=Internal CA"

# Service certificate signing request
openssl req -newkey ec -pkeyopt ec_paramgen_curve:P-256 \
  -nodes -keyout service.key -out service.csr \
  -subj "/CN=api.internal" \
  -addext "subjectAltName=DNS:api.internal,DNS:api.svc.cluster.local"

# Sign with CA
openssl x509 -req -in service.csr -CA ca.crt -CAkey ca.key \
  -CAcreateserial -out service.crt -days 90 \
  -extfile <(printf "subjectAltName=DNS:api.internal,DNS:api.svc.cluster.local")
```

**Automated Certificate Management**
```yaml
# cert-manager (Kubernetes) ClusterIssuer
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: ops@example.com
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
      - http01:
          ingress:
            class: nginx

---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: api-tls
spec:
  secretName: api-tls-secret
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - api.example.com
  duration: 2160h    # 90 days
  renewBefore: 720h  # 30 days before expiry
```

## Gotchas

- Missing intermediate cert = works in some browsers but fails in API clients
- Wildcard certs (*.example.com) don't cover the apex (example.com)
- Certificate pinning is dangerous -- pin to intermediate, not leaf; have backup pins
- Clock skew on servers causes "not yet valid" or "expired" errors
- Let's Encrypt rate limits: plan for bulk issuance, use staging for testing
- Internal PKI: distribute CA cert to all clients that need to verify

## Verification

- `openssl s_client -connect host:443 -showcerts` shows full chain
- `openssl verify -CAfile ca.crt -untrusted intermediate.crt leaf.crt` validates chain
- CT log monitoring alerts on unexpected certificates for your domain
- Certificate expiry monitoring fires alert 30+ days before expiry
- mTLS: connection fails when client presents cert from wrong CA
