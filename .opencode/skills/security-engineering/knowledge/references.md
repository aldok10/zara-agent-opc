# Security Engineering References

Curated references for subskills: api-security, authentication, secure-coding, supply-chain, threat-modeling, zero-trust.

---

## OWASP & Standards

1. **OWASP Top 10 2025** -- https://owasp.org/Top10/ -- Updated web application security risks ranking
2. **OWASP API Security Top 10 2023** -- https://owasp.org/API-Security/ -- API-specific vulnerability categories (BOLA, broken auth, mass assignment)
3. **OWASP ASVS v4.0.3** -- https://owasp.org/www-project-application-security-verification-standard/ -- Tiered security requirements for application verification
4. **OWASP Testing Guide v5** -- https://owasp.org/www-project-web-security-testing-guide/ -- Methodology and techniques for security testing
5. **OWASP Cheat Sheet Series** -- https://cheatsheetseries.owasp.org/ -- Practical guidance on specific security topics (80+ cheat sheets)
6. **OWASP SAMM** -- https://owaspsamm.org/ -- Software Assurance Maturity Model for measuring security programs
7. **OWASP Dependency-Check** -- https://owasp.org/www-project-dependency-check/ -- SCA tool identifying known vulnerabilities in dependencies
8. **CWE Top 25 Most Dangerous Software Weaknesses 2025** -- https://cwe.mitre.org/top25/ -- MITRE ranking of exploitable software weaknesses
9. **NIST Cybersecurity Framework 2.0** -- https://www.nist.gov/cyberframework -- Govern, Identify, Protect, Detect, Respond, Recover functions
10. **NIST SP 800-53 Rev 5** -- https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final -- Security and privacy controls catalog
11. **ISO 27001:2022** -- https://www.iso.org/standard/27001 -- Information security management system standard
12. **PCI DSS v4.0** -- https://www.pcisecuritystandards.org/ -- Payment card industry data security standard
13. **SANS Top 25 Software Errors** -- https://www.sans.org/top25-software-errors/ -- Common programming errors leading to vulnerabilities
14. **MITRE ATT&CK Framework** -- https://attack.mitre.org/ -- Adversary tactics, techniques, and procedures knowledge base
15. **OWASP Proactive Controls** -- https://owasp.org/www-project-proactive-controls/ -- Top 10 security techniques developers must implement
16. **NIST SP 800-63B** -- https://pages.nist.gov/800-63-3/sp800-63b.html -- Digital identity authentication guidelines
17. **CIS Benchmarks** -- https://www.cisecurity.org/cis-benchmarks -- Configuration security baselines for platforms and services
18. **OWASP Mobile Top 10** -- https://owasp.org/www-project-mobile-top-10/ -- Mobile application security risks
19. **OWASP Secure Coding Practices Quick Reference** -- https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/ -- Developer-focused secure coding checklist
20. **NIST SP 800-160 Vol 1** -- https://csrc.nist.gov/publications/detail/sp/800-160/vol-1/final -- Systems security engineering fundamentals

## Threat Modeling

21. **Threat Modeling: Designing for Security** -- Adam Shostack (Wiley, 2014) -- Definitive book on structured threat modeling approaches
22. **STRIDE Methodology** -- Microsoft SDL -- Spoofing, Tampering, Repudiation, Info Disclosure, DoS, Elevation of Privilege
23. **LINDDUN Privacy Threat Modeling** -- https://linddun.org/ -- Linkability, Identifiability, Non-repudiation, Detectability, Disclosure, Unawareness, Non-compliance
24. **PASTA (Process for Attack Simulation and Threat Analysis)** -- Risk-centric 7-stage methodology linking business objectives to technical threats
25. **Microsoft SDL Threat Modeling Tool** -- https://www.microsoft.com/en-us/securityengineering/sdl/threatmodeling -- DFD-based automated threat generation
26. **Threagile** -- https://threagile.io/ -- Threat modeling as code (YAML-based), CI/CD integration
27. **OWASP Threat Dragon** -- https://owasp.org/www-project-threat-dragon/ -- Open source threat modeling tool with diagram support
28. **Elevation of Privilege Card Game** -- Adam Shostack -- Gamified threat discovery for development teams
29. **VAST (Visual, Agile, Simple Threat) Modeling** -- ThreatModeler -- Scalable threat modeling for agile/DevOps workflows
30. **Attack Trees** -- Bruce Schneier -- Hierarchical decomposition of attack goals into sub-goals
31. **OCTAVE Allegro** -- Carnegie Mellon SEI -- Operational risk-based threat assessment for organizations
32. **Rapid Threat Model Prototyping** -- Geoffrey Hill -- Lightweight threat modeling for fast iteration cycles
33. **Threat Modeling Manifesto** -- https://www.threatmodelingmanifesto.org/ -- Principles and values for effective threat modeling
34. **CAIRIS (Computer Aided Integration of Requirements and Information Security)** -- https://cairis.org/ -- Requirements-driven threat modeling tool
35. **IriusRisk** -- https://www.iriusrisk.com/ -- Automated threat modeling platform with standards mapping

## Authentication & Identity

36. **OAuth 2.1 (draft-ietf-oauth-v2-1)** -- https://datatracker.ietf.org/doc/draft-ietf-oauth-v2-1/ -- Consolidated OAuth spec removing implicit/ROPC grants
37. **OpenID Connect Core 1.0** -- https://openid.net/specs/openid-connect-core-1_0.html -- Identity layer on top of OAuth 2.0
38. **WebAuthn Level 3** -- https://www.w3.org/TR/webauthn-3/ -- Web Authentication API for passwordless/passkey authentication
39. **FIDO2 Specifications** -- https://fidoalliance.org/fido2/ -- CTAP2 + WebAuthn for phishing-resistant authentication
40. **RFC 7519 (JWT)** -- https://datatracker.ietf.org/doc/html/rfc7519 -- JSON Web Token format specification
41. **RFC 9068 (JWT Profile for OAuth 2.0 Access Tokens)** -- https://datatracker.ietf.org/doc/html/rfc9068 -- Standardized JWT access token format
42. **RFC 7516 (JWE)** -- https://datatracker.ietf.org/doc/html/rfc7516 -- JSON Web Encryption for token confidentiality
43. **Passkeys Developer Guide** -- https://passkeys.dev/ -- Implementation guide for passkey adoption
44. **OWASP Session Management Cheat Sheet** -- https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html -- Session lifecycle security patterns
45. **RFC 6749 (OAuth 2.0)** -- https://datatracker.ietf.org/doc/html/rfc6749 -- Original OAuth 2.0 authorization framework
46. **RFC 7636 (PKCE)** -- https://datatracker.ietf.org/doc/html/rfc7636 -- Proof Key for Code Exchange for public clients
47. **OpenID Connect Discovery** -- https://openid.net/specs/openid-connect-discovery-1_0.html -- Provider metadata auto-discovery
48. **DPoP (RFC 9449)** -- https://datatracker.ietf.org/doc/html/rfc9449 -- Demonstrating Proof of Possession for tokens
49. **Token Binding (RFC 8471)** -- https://datatracker.ietf.org/doc/html/rfc8471 -- Cryptographic binding of tokens to TLS connections
50. **SCIM (RFC 7644)** -- https://datatracker.ietf.org/doc/html/rfc7644 -- Cross-domain identity management protocol

## Zero Trust

51. **NIST SP 800-207 (Zero Trust Architecture)** -- https://csrc.nist.gov/publications/detail/sp/800-207/final -- Federal zero trust architecture specification
52. **BeyondCorp: A New Approach to Enterprise Security** -- Google Research paper -- Device-centric access without VPN
53. **BeyondCorp: Design to Deployment at Google** -- Google Research -- Implementation details of production zero trust
54. **BeyondCorp: The Access Proxy** -- Google Research -- Network access proxy as policy enforcement point
55. **ZTNA (Zero Trust Network Access) Architecture** -- Gartner -- Application-specific access replacing network-level trust
56. **Service Mesh Security (Istio mTLS)** -- https://istio.io/latest/docs/concepts/security/ -- Mutual TLS and service identity in mesh
57. **SPIFFE/SPIRE** -- https://spiffe.io/ -- Secure Production Identity Framework for workload identity
58. **Microsegmentation Patterns** -- Network segmentation at workload level for lateral movement prevention
59. **CISA Zero Trust Maturity Model** -- https://www.cisa.gov/zero-trust-maturity-model -- Federal agency zero trust adoption guide
60. **Policy-Based Access Control (PBAC)** -- Attribute-aware, context-driven authorization decisions

## Supply Chain Security

61. **SLSA (Supply-chain Levels for Software Artifacts)** -- https://slsa.dev/ -- Framework for software supply chain integrity levels (v1.0)
62. **Sigstore** -- https://www.sigstore.dev/ -- Keyless signing and verification for software artifacts
63. **cosign** -- https://docs.sigstore.dev/cosign/overview/ -- Container image signing and verification tool
64. **SPDX (Software Package Data Exchange)** -- https://spdx.dev/ -- ISO standard SBOM format (ISO/IEC 5962:2021)
65. **CycloneDX** -- https://cyclonedx.org/ -- OWASP SBOM standard with VEX support
66. **Dependency Confusion (Alex Birsan)** -- https://medium.com/@alex.birsan/dependency-confusion-4a5d60fec610 -- Private/public package namespace attacks
67. **npm Supply Chain Attacks Research** -- Typosquatting, protestware, and maintainer compromise case studies
68. **PyPI Malware Research** -- https://blog.phylum.io/ -- Python package ecosystem threat intelligence
69. **Go Module Proxy and Checksum DB** -- https://sum.golang.org/ -- Go supply chain integrity verification
70. **Scorecard (OpenSSF)** -- https://securityscorecards.dev/ -- Automated security health checks for open source projects
71. **in-toto** -- https://in-toto.io/ -- Framework for software supply chain layout verification
72. **The Update Framework (TUF)** -- https://theupdateframework.io/ -- Secure software update system design
73. **OpenSSF Best Practices Badge** -- https://www.bestpractices.dev/ -- Criteria for secure open source project maintenance
74. **Reproducible Builds** -- https://reproducible-builds.org/ -- Verifiable build output for supply chain trust
75. **Socket.dev** -- https://socket.dev/ -- Dependency risk detection for npm, PyPI, Go ecosystems

## Secure Coding

76. **OWASP Input Validation Cheat Sheet** -- https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html -- Allow-list validation patterns
77. **SQL Injection Prevention (OWASP)** -- https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html -- Parameterized queries and ORM safety
78. **XSS Prevention (OWASP)** -- https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html -- Output encoding and CSP
79. **Command Injection Defense** -- https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html -- Avoiding shell execution
80. **Cryptographic Storage (OWASP)** -- https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html -- Algorithm selection and key management
81. **CERT SEI Secure Coding Standards** -- https://wiki.sei.cmu.edu/confluence/display/seccode -- Language-specific (C, C++, Java) secure coding rules
82. **Rust Safety Model** -- https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html -- Ownership, borrowing, lifetimes for memory safety
83. **Memory Safety in Systems Programming** -- NSA guidance on memory-safe languages (2022) -- Transition away from C/C++ where feasible
84. **OWASP Deserialization Cheat Sheet** -- https://cheatsheetseries.owasp.org/cheatsheets/Deserialization_Cheat_Sheet.html -- Untrusted data deserialization defenses
85. **Path Traversal Prevention** -- https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html -- File upload and path validation
86. **SSRF Prevention** -- https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html -- Server-side request forgery defenses
87. **Content Security Policy (CSP)** -- https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP -- Browser-side injection mitigation
88. **Subresource Integrity (SRI)** -- https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity -- CDN tamper detection
89. **OWASP Error Handling Cheat Sheet** -- https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html -- Safe error messages without information leakage
90. **Secure Defaults Principle** -- Fail-closed design, deny-by-default, minimal privilege patterns

## API Security

91. **Rate Limiting Patterns** -- Token bucket, sliding window, leaky bucket algorithms for API abuse prevention
92. **API Key Management Best Practices** -- Rotation, scoping, environment separation, secret storage patterns
93. **CORS Security Configuration** -- https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS -- Origin validation and credential handling
94. **GraphQL Security (OWASP)** -- https://cheatsheetseries.owasp.org/cheatsheets/GraphQL_Cheat_Sheet.html -- Query depth limiting, cost analysis, introspection control
95. **gRPC Security** -- https://grpc.io/docs/guides/auth/ -- TLS, token-based auth, interceptors for gRPC services
96. **API Gateway Security Patterns** -- Authentication offloading, request validation, traffic shaping at gateway layer
97. **OWASP REST Security Cheat Sheet** -- https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html -- REST API hardening techniques
98. **OpenAPI Security Schemes** -- https://swagger.io/docs/specification/authentication/ -- Declaring auth in API specifications
99. **Webhook Security** -- HMAC signature verification, replay protection, idempotency for inbound webhooks
100. **API Versioning and Deprecation Security** -- Safe migration patterns preventing version-downgrade attacks

## Tools & Automation

101. **Semgrep** -- https://semgrep.dev/ -- Lightweight static analysis with custom rules (SAST)
102. **Trivy** -- https://trivy.dev/ -- Container image, filesystem, and IaC vulnerability scanner
103. **Grype** -- https://github.com/anchore/grype -- Vulnerability scanner for container images and filesystems
104. **Snyk** -- https://snyk.io/ -- Developer-first SCA, container, and IaC security platform
105. **GitHub Advanced Security** -- https://docs.github.com/en/code-security -- CodeQL, secret scanning, Dependabot integration
106. **OWASP ZAP** -- https://www.zaproxy.org/ -- Open source DAST proxy for web application testing
107. **Nuclei** -- https://nuclei.projectdiscovery.io/ -- Template-based vulnerability scanner for automation
108. **TruffleHog** -- https://github.com/trufflesecurity/trufflehog -- Git history secret detection and verification
109. **Gitleaks** -- https://github.com/gitleaks/gitleaks -- Secret scanning for git repos with pre-commit hooks
110. **Checkov** -- https://www.checkov.io/ -- Infrastructure-as-code static analysis (Terraform, K8s, Docker)
111. **SAST/DAST Pipeline Integration** -- CI/CD security gate patterns: fail builds on critical findings, baseline management
112. **Talisman** -- https://github.com/thoughtworks/talisman -- Pre-push hook for secret and sensitive content detection
