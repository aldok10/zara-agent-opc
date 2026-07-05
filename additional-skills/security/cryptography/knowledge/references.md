# References

## PKI and Certificates (10 refs)
- **Let's Encrypt** -- https://letsencrypt.org/docs/ -- Free automated CA with ACME protocol
- **RFC 5280 X.509** -- https://datatracker.ietf.org/doc/html/rfc5280 -- Internet X.509 PKI certificate and CRL profile
- **ACME Protocol RFC 8555** -- https://datatracker.ietf.org/doc/html/rfc8555 -- Automatic Certificate Management Environment
- **step-ca** -- https://smallstep.com/docs/step-ca/ -- Open-source private CA and ACME server
- **cert-manager** -- https://cert-manager.io/ -- Kubernetes-native certificate management controller
- **cfssl** -- https://github.com/cloudflare/cfssl -- Cloudflare's PKI/TLS toolkit and CA
- **OpenSSL** -- https://www.openssl.org/docs/ -- Cryptography and SSL/TLS toolkit reference
- **mkcert** -- https://github.com/FiloSottile/mkcert -- Local development CA with system trust
- **Certificate Transparency** -- https://certificate.transparency.dev/ -- Public log auditing of issued certificates
- **Venafi** -- https://venafi.com/ -- Enterprise machine identity and certificate lifecycle

## Key Management (10 refs)
- **AWS KMS** -- https://docs.aws.amazon.com/kms/ -- Cloud key management with HSM backing
- **Google Cloud KMS** -- https://cloud.google.com/kms/docs -- Centralized cloud key management service
- **Azure Key Vault** -- https://learn.microsoft.com/en-us/azure/key-vault/ -- Secrets, keys, and certificate management
- **HashiCorp Vault** -- https://developer.hashicorp.com/vault/docs -- Secrets management and encryption as a service
- **SOPS** -- https://github.com/getsops/sops -- Encrypted file editor supporting multiple KMS backends
- **Sealed Secrets** -- https://sealed-secrets.netlify.app/ -- Encrypt Kubernetes secrets for safe git storage
- **External Secrets Operator** -- https://external-secrets.io/ -- Sync secrets from external stores to Kubernetes
- **NIST SP 800-57** -- https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final -- Key management best practices and lifecycle
- **CKM (OASIS KMIP)** -- https://www.oasis-open.org/committees/kmip/ -- Key Management Interoperability Protocol standard
- **Infisical** -- https://infisical.com/ -- Open-source secret management platform for teams

## Encryption Standards (10 refs)
- **NIST SP 800-175B** -- https://csrc.nist.gov/publications/detail/sp/800-175b/rev-1/final -- Guideline for using cryptographic standards
- **AES (FIPS 197)** -- https://csrc.nist.gov/publications/detail/fips/197/final -- Advanced Encryption Standard specification
- **ChaCha20-Poly1305 RFC 8439** -- https://datatracker.ietf.org/doc/html/rfc8439 -- AEAD cipher for TLS and general use
- **TLS 1.3 RFC 8446** -- https://datatracker.ietf.org/doc/html/rfc8446 -- Modern transport layer security protocol
- **Signal Protocol** -- https://signal.org/docs/ -- Double Ratchet end-to-end encryption protocol
- **NaCl/libsodium** -- https://nacl.cr.yp.to/ -- High-speed cryptographic library by djb
- **NIST Post-Quantum** -- https://csrc.nist.gov/projects/post-quantum-cryptography -- Post-quantum cryptography standardization
- **WireGuard** -- https://www.wireguard.com/papers/wireguard.pdf -- Modern VPN protocol with minimal crypto surface
- **HPKE RFC 9180** -- https://datatracker.ietf.org/doc/html/rfc9180 -- Hybrid Public Key Encryption for modern protocols
- **MLS RFC 9420** -- https://datatracker.ietf.org/doc/html/rfc9420 -- Messaging Layer Security for group encryption

## Hashing and Integrity (10 refs)
- **SHA-3 (FIPS 202)** -- https://csrc.nist.gov/publications/detail/fips/202/final -- Keccak-based hash function standard
- **BLAKE3** -- https://github.com/BLAKE3-team/BLAKE3 -- Fast cryptographic hash function
- **Argon2 RFC 9106** -- https://datatracker.ietf.org/doc/html/rfc9106 -- Memory-hard password hashing function
- **bcrypt** -- https://www.usenix.org/legacy/events/usenix99/provos/provos.pdf -- Adaptive password hashing based on Blowfish
- **scrypt RFC 7914** -- https://datatracker.ietf.org/doc/html/rfc7914 -- Memory-hard key derivation function
- **HMAC RFC 2104** -- https://datatracker.ietf.org/doc/html/rfc2104 -- Keyed-hash message authentication code
- **Merkle Trees** -- https://nakamotoinstitute.org/bitcoin/ -- Hash tree structure for data integrity verification
- **Sigstore/Cosign** -- https://www.sigstore.dev/ -- Keyless signing and verification for artifacts
- **in-toto** -- https://in-toto.io/ -- Supply chain integrity verification framework
- **SLSA Framework** -- https://slsa.dev/ -- Supply-chain Levels for Software Artifacts
