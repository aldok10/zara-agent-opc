---
type: fact
title: "Pentest Methodology"
---

# Penetration Testing Methodology

## Frameworks

### PTES (Penetration Testing Execution Standard)
- Seven phases: pre-engagement, intelligence gathering, threat modeling, vulnerability analysis, exploitation, post-exploitation, reporting
- Most widely referenced standard for structured testing
- Defines depth levels and scope expectations

### OSSTMM (Open Source Security Testing Methodology Manual)
- Quantitative approach with RAV (Risk Assessment Values)
- Five channels: human, physical, wireless, telecom, data networks
- Focuses on operational security metrics
- Less common but valued for its measurability

### OWASP Testing Guide
- Web application focused (v4.2 current)
- 91 test cases organized by vulnerability class
- Pairs with OWASP WSTG (Web Security Testing Guide)
- Standard reference for web app assessments

## Phase 1: Pre-Engagement

### Scoping
- Define targets: IP ranges, domains, applications, APIs
- Rules of engagement: testing hours, off-limits systems, emergency contacts
- Type: black box (no info), grey box (partial access), white box (full access)
- Legal: signed authorization, scope boundaries, liability

### Success Criteria
- Clear objectives: "prove data exfiltration path" vs "find all vulns"
- Reporting expectations: executive summary, technical detail level
- Retesting included or separate engagement
- Timeline and communication cadence

## Phase 2: Reconnaissance

### Passive (OSINT)
- DNS enumeration: subdomains, mail servers, zone transfers
- Certificate transparency logs (crt.sh)
- Public code repos: leaked credentials, internal URLs, API keys
- Employee information: LinkedIn, email patterns, org structure
- Technology fingerprinting: Wappalyzer, BuiltWith, HTTP headers
- Archived content: Wayback Machine for old endpoints

### Active
- Port scanning: Nmap (SYN, version detection, scripts)
- Service enumeration: banner grabbing, protocol probing
- Web crawling: directory brute-force (feroxbuster, gobuster)
- Virtual host discovery
- API endpoint enumeration (wordlists, OpenAPI spec if available)

## Phase 3: Vulnerability Analysis

### Automated Scanning
- Nessus/OpenVAS: network vulnerability scanning
- Nuclei: template-based web vulnerability scanning
- Nikto: web server misconfiguration checks
- SQLMap: SQL injection detection and exploitation

### Manual Analysis
- Business logic flaws (automated tools miss these)
- Authentication weaknesses: password policy, MFA bypass, session handling
- Authorization: IDOR, privilege escalation, horizontal access
- Input validation: injection points, encoding bypasses
- Race conditions and timing attacks

### Prioritization
- Rank by: exploitability × impact × exposure
- Focus on chains: low-severity findings that combine into critical paths
- Note: not all vulnerabilities need active exploitation to prove risk

## Phase 4: Exploitation

### Principles
- Minimum force: use simplest exploit that proves the point
- Document everything: commands, timestamps, screenshots
- Avoid destructive actions: no data deletion, no DoS
- Maintain stealth where scope requires (red team vs pentest)

### Common Attack Vectors
- Default/weak credentials on exposed services
- Known CVEs with public exploits (check exploit-db, GitHub)
- SQL injection → database access → credential extraction
- SSRF → internal service access → cloud metadata
- Deserialization → remote code execution
- File upload → webshell → command execution

### Credential Attacks
- Password spraying (avoid lockouts: low and slow)
- Credential stuffing from breach databases
- Hash cracking: hashcat with rules, cloud GPU instances
- Pass-the-hash / pass-the-ticket (Active Directory)
- Kerberoasting for service account hashes

## Phase 5: Post-Exploitation

### Objectives
- Prove business impact: what data/systems are reachable?
- Lateral movement: pivot to higher-value targets
- Privilege escalation: local admin → domain admin path
- Data access: demonstrate what sensitive data is reachable
- Persistence: show how attacker would maintain access (document, don't deploy)

### Documentation During
- Screenshots of accessed sensitive data (redact PII)
- Command history with timestamps
- Network diagram of pivot path
- Credentials obtained (report hashes, not cleartext unless needed)

## Phase 6: Reporting

### Executive Summary
- Business risk in non-technical language
- Critical findings with real-world impact scenarios
- High-level timeline of attack path
- Top 3-5 recommendations prioritized by risk reduction

### Technical Report Structure
1. Methodology and scope
2. Findings (each with: description, severity, evidence, remediation)
3. Attack narrative (story of the full chain)
4. Detailed remediation guidance
5. Appendices: raw tool output, full screenshots

### Severity Rating
- Use CVSS or client's preferred framework
- Factor in: business context, data sensitivity, exploitability
- Critical: unauthenticated RCE, mass data exposure
- High: authenticated RCE, privilege escalation to admin
- Medium: information disclosure, limited injection
- Low: missing headers, verbose errors, minor misconfig

## Phase 7: Retesting

### Process
- Fixed timeline after client remediation (typically 2-4 weeks)
- Re-test only the specific findings from original report
- Verify fix effectiveness, not just presence of patch
- Update finding status: fixed, partially fixed, not fixed
- New findings during retest noted but out of scope

### Verification Approaches
- Replay original exploitation steps
- Attempt bypass of implemented fix
- Confirm defense-in-depth (not just patching the specific vector)
- Check for regression in related functionality

## Tools by Phase

| Phase | Primary Tools |
|-------|--------------|
| Recon | Nmap, Amass, subfinder, httpx, Shodan |
| Vuln Analysis | Burp Suite, Nuclei, SQLMap, Nikto |
| Exploitation | Metasploit, custom scripts, CrackMapExec |
| Post-Exploit | BloodHound, Mimikatz, Cobalt Strike, Ligolo |
| Reporting | Ghostwriter, PlexTrac, custom templates |
