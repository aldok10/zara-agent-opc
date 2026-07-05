# Reconnaissance

OSINT techniques, subdomain enumeration, technology fingerprinting, and attack surface mapping.

## When to Load

- Beginning a penetration test engagement (external assessment)
- Mapping an organization's external attack surface
- Identifying technologies and versions in use
- Discovering shadow IT and forgotten assets

## Key Concepts

**Reconnaissance Phases**
1. Passive: no direct contact with target (OSINT, public records)
2. Semi-passive: normal-looking traffic (web browsing, DNS lookups)
3. Active: direct probing (port scanning, directory brute force)

**Passive OSINT Sources**
- DNS records: A, AAAA, MX, TXT, NS, CNAME, SPF, DKIM, DMARC
- Certificate Transparency logs: discover subdomains from issued certs
- WHOIS: registrant info, name servers, creation dates
- Search engine dorking: site:, inurl:, filetype:, intitle:
- Code repositories: leaked credentials, internal URLs, API keys
- Job postings: technology stack hints ("experience with X required")
- Social media: employee profiles revealing internal tools
- Shodan/Censys: exposed services, banners, certificates

**Subdomain Enumeration Techniques**
- Certificate Transparency: crt.sh, certspotter
- DNS brute force: wordlists against target domain
- DNS zone transfer attempts (rarely works, always try)
- Search engine indexing: site:*.example.com
- Reverse DNS on IP ranges owned by the organization
- Content scraping: find references to subdomains in JavaScript, HTML
- Historical DNS: SecurityTrails, passive DNS databases

## Patterns

```bash
# Subdomain enumeration pipeline
# Step 1: Certificate Transparency
curl -s "https://crt.sh/?q=%25.example.com&output=json" | \
  jq -r '.[].name_value' | sort -u > ct_subdomains.txt

# Step 2: DNS brute force (using amass or similar)
amass enum -passive -d example.com -o amass_subdomains.txt

# Step 3: Resolve and probe
cat all_subdomains.txt | httpx -silent -status-code -title -tech-detect > live_hosts.txt

# Step 4: Port scanning on discovered hosts
nmap -sS -T4 -p- --min-rate 1000 -oA full_scan target_ips.txt
```

**Technology Fingerprinting Signals**
- HTTP headers: Server, X-Powered-By, X-AspNet-Version
- Cookie names: JSESSIONID (Java), PHPSESSID (PHP), connect.sid (Node)
- HTML meta tags and generator strings
- JavaScript library versions in source
- Error page templates (default Tomcat, IIS, nginx error pages)
- URL patterns: .aspx (ASP.NET), .php, /wp-admin/ (WordPress)

**Attack Surface Mapping Output**
```
Domain: example.com
Subdomains: 47 discovered, 32 live
IP Ranges: 10.0.0.0/24 (AWS us-east-1), 172.16.0.0/24 (Azure West EU)
Technologies:
  - Web: React frontend, Node.js API (Express)
  - Infrastructure: AWS (CloudFront, ALB, ECS)
  - Email: Google Workspace (SPF/DKIM confirmed)
  - DNS: Route53
Exposed Services:
  - 443/tcp: 28 hosts (HTTPS)
  - 22/tcp: 3 hosts (SSH -- should these be public?)
  - 8080/tcp: 1 host (staging? no auth required)
```

## Gotchas

- Scope creep: only test assets you have authorization for
- Passive recon can trigger alerts if you scrape too aggressively
- Historical DNS data may include decommissioned assets (verify liveness)
- CDN IPs are not the origin -- finding the origin requires bypass techniques
- Wildcard DNS responses give false positives in brute force
- Some CT logs lag by hours/days -- newly issued certs may not appear immediately

## Verification

- All discovered assets confirmed as in-scope before active testing
- Subdomain list validated with DNS resolution (remove dead entries)
- Technology fingerprinting cross-referenced with multiple signals
- No out-of-scope systems contacted during active reconnaissance
- Attack surface report reviewed with client before proceeding to exploitation
