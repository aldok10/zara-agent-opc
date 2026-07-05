# TLS & mTLS

cert-manager, ACME, certificate lifecycle, pinning, and mutual TLS patterns.

## When to Load
- Automating certificate issuance with cert-manager
- Setting up Let's Encrypt (ACME) for production
- Implementing mutual TLS between services
- Troubleshooting certificate errors

## Key Concepts

**TLS vs mTLS:** TLS -- client verifies server. mTLS -- both sides verify each other. mTLS provides service identity without tokens.

**Certificate lifecycle:** issuance -> deployment -> monitoring -> renewal -> rotation. Automate everything -- manual certs are the #1 cause of outages.

**ACME (Automated Certificate Management Environment):** protocol for automated certificate issuance. Let's Encrypt is the most common CA. Challenge types: HTTP-01 (port 80), DNS-01 (TXT records, supports wildcards).

**cert-manager:** Kubernetes-native certificate management. Watches Certificate resources, interacts with CAs, stores certs in Secrets, handles renewal.

## Patterns

**cert-manager with Let's Encrypt (production):**
```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v2.api.letsencrypt.org/directory
    email: platform@company.com
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
      - dns01:
          route53:
            region: us-east-1
        selector:
          dnsZones:
            - "company.com"
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: api-cert
  namespace: default
spec:
  secretName: api-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - api.company.com
    - "*.api.company.com"
  renewBefore: 720h
```

**mTLS with private CA:**
```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: internal-ca
spec:
  ca:
    secretName: internal-ca-keypair
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: service-a-mtls
spec:
  secretName: service-a-tls
  issuerRef:
    name: internal-ca
    kind: ClusterIssuer
  commonName: service-a.default.svc.cluster.local
  dnsNames:
    - service-a
    - service-a.default.svc.cluster.local
  usages:
    - server auth
    - client auth
  duration: 720h
  renewBefore: 168h
```

**Ingress with automatic TLS:**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts: [api.company.com]
      secretName: api-tls
  rules:
    - host: api.company.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api
                port: { number: 8080 }
```

## Gotchas
- Let's Encrypt rate limits: 50 certs/domain/week, 5 failures/hour/account
- DNS-01 challenge requires DNS provider API access from cert-manager
- Certificate renewal happens at `renewBefore` time -- default is 30 days before expiry
- mTLS certificate pinning breaks rotation -- pin to CA, not leaf certificate
- cert-manager Secrets contain `tls.crt`, `tls.key`, `ca.crt` -- apps must watch for changes
- Wildcard certs require DNS-01 challenge (HTTP-01 doesn't support wildcards)
- Short-lived certs (hours) reduce blast radius but require reliable automation

## Verification
- `kubectl get certificates -A` for cert status and expiry
- `kubectl describe certificate <name>` for issuance events
- `openssl s_client -connect host:443 -servername host` to inspect live cert
- `openssl x509 -in cert.pem -text -noout` for cert details
- `cmctl status certificate <name>` for cert-manager CLI check
- cert-manager metrics: `certmanager_certificate_expiration_timestamp_seconds`
