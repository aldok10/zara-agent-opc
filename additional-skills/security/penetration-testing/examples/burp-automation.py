"""
Burp Suite automation script for common security tests.
Requires Burp Suite Professional with REST API enabled.
Uses the Burp REST API (introduced in Burp Suite 2023+).
"""
import time
import sys
from dataclasses import dataclass
from urllib.parse import urljoin

import httpx


@dataclass
class BurpConfig:
    api_url: str = "http://127.0.0.1:1337"
    api_key: str = ""
    timeout: int = 30


@dataclass
class ScanConfig:
    urls: list[str]
    crawl_depth: int = 3
    audit_checks: list[str] | None = None
    excluded_paths: list[str] | None = None
    auth_credentials: dict | None = None


class BurpAutomation:
    def __init__(self, config: BurpConfig):
        self.config = config
        self.client = httpx.Client(
            base_url=config.api_url,
            headers={"Authorization": config.api_key} if config.api_key else {},
            timeout=config.timeout,
        )

    def start_scan(self, scan_config: ScanConfig) -> str:
        scan_request = {
            "urls": scan_config.urls,
            "scan_configurations": self._build_scan_configs(scan_config),
        }

        if scan_config.auth_credentials:
            scan_request["application_logins"] = [scan_config.auth_credentials]

        if scan_config.excluded_paths:
            scan_request["scope"] = {
                "exclude": [{"rule": path} for path in scan_config.excluded_paths]
            }

        response = self.client.post("/v0.1/scan", json=scan_request)
        response.raise_for_status()

        task_id = response.headers.get("Location", "").split("/")[-1]
        print(f"[+] Scan started: task_id={task_id}")
        return task_id

    def get_scan_status(self, task_id: str) -> dict:
        response = self.client.get(f"/v0.1/scan/{task_id}")
        response.raise_for_status()
        return response.json()

    def wait_for_scan(self, task_id: str, poll_interval: int = 10) -> dict:
        print(f"[*] Waiting for scan {task_id} to complete...")
        while True:
            status = self.get_scan_status(task_id)
            scan_status = status.get("scan_status", "unknown")

            if scan_status in ("succeeded", "failed", "paused"):
                print(f"[+] Scan {scan_status}")
                return status

            metrics = status.get("scan_metrics", {})
            crawl_count = metrics.get("crawl_requests_made", 0)
            audit_count = metrics.get("audit_requests_made", 0)
            print(
                f"    Status: {scan_status} | "
                f"Crawled: {crawl_count} | "
                f"Audited: {audit_count}"
            )

            time.sleep(poll_interval)

    def get_issues(self, task_id: str) -> list[dict]:
        status = self.get_scan_status(task_id)
        issues = status.get("issue_events", [])
        return [event.get("issue", {}) for event in issues]

    def generate_report(self, issues: list[dict]) -> str:
        severity_order = {"high": 0, "medium": 1, "low": 2, "info": 3}
        sorted_issues = sorted(
            issues,
            key=lambda x: severity_order.get(x.get("severity", "info"), 99),
        )

        lines = ["# Security Scan Report", ""]
        lines.append(f"**Total findings:** {len(sorted_issues)}")
        lines.append("")

        severity_counts = {}
        for issue in sorted_issues:
            sev = issue.get("severity", "info")
            severity_counts[sev] = severity_counts.get(sev, 0) + 1

        lines.append("## Summary")
        for sev in ("high", "medium", "low", "info"):
            count = severity_counts.get(sev, 0)
            if count:
                lines.append(f"- **{sev.upper()}**: {count}")
        lines.append("")

        lines.append("## Findings")
        for i, issue in enumerate(sorted_issues, 1):
            name = issue.get("name", "Unknown")
            severity = issue.get("severity", "info").upper()
            origin = issue.get("origin", "")
            path = issue.get("path", "")
            confidence = issue.get("confidence", "")

            lines.append(f"### {i}. [{severity}] {name}")
            lines.append(f"- **URL:** {origin}{path}")
            lines.append(f"- **Confidence:** {confidence}")
            if issue.get("description"):
                lines.append(f"- **Description:** {issue['description'][:200]}")
            lines.append("")

        return "\n".join(lines)

    def _build_scan_configs(self, scan_config: ScanConfig) -> list[dict]:
        configs = []

        if scan_config.audit_checks:
            configs.append({
                "type": "CustomConfiguration",
                "name": "custom-audit",
                "audit_optimization": {
                    "consolidate_passive_issues": True,
                },
                "audit_checks": scan_config.audit_checks,
            })
        else:
            configs.append({"type": "NamedConfiguration", "name": "Audit checks - all except JavaScript analysis"})

        return configs

    def close(self):
        self.client.close()


def run_authenticated_scan(
    target_url: str,
    login_url: str,
    username: str,
    password: str,
    api_key: str = "",
) -> list[dict]:
    config = BurpConfig(api_key=api_key)
    burp = BurpAutomation(config)

    scan_config = ScanConfig(
        urls=[target_url],
        crawl_depth=4,
        auth_credentials={
            "password": password,
            "username": username,
            "type": "UsernameAndPasswordLogin",
            "login_url": login_url,
        },
        excluded_paths=[
            "/logout",
            "/api/v1/admin/delete",
        ],
    )

    try:
        task_id = burp.start_scan(scan_config)
        burp.wait_for_scan(task_id)
        issues = burp.get_issues(task_id)
        report = burp.generate_report(issues)
        print(report)
        return issues
    finally:
        burp.close()


def run_api_scan(
    openapi_spec_url: str,
    base_url: str,
    auth_header: str = "",
    api_key: str = "",
) -> list[dict]:
    config = BurpConfig(api_key=api_key)
    burp = BurpAutomation(config)

    scan_config = ScanConfig(
        urls=[base_url],
        audit_checks=[
            "SQL injection",
            "OS command injection",
            "Server-side template injection",
            "Cross-site scripting (reflected)",
            "XML external entity injection",
            "Server-side request forgery",
            "Path traversal",
            "HTTP request smuggling",
        ],
    )

    try:
        task_id = burp.start_scan(scan_config)
        burp.wait_for_scan(task_id)
        issues = burp.get_issues(task_id)

        high_critical = [
            i for i in issues if i.get("severity") in ("high", "critical")
        ]
        if high_critical:
            print(f"\n[!] {len(high_critical)} HIGH/CRITICAL findings detected!")
            for issue in high_critical:
                print(f"    - {issue.get('name')} at {issue.get('path')}")

        return issues
    finally:
        burp.close()


def bola_test(
    base_url: str,
    endpoints: list[str],
    user_a_token: str,
    user_b_token: str,
) -> list[dict]:
    """
    Test for Broken Object Level Authorization (BOLA/IDOR).
    Accesses User A's resources with User B's token.
    """
    findings = []

    with httpx.Client(timeout=10) as client:
        for endpoint in endpoints:
            url = urljoin(base_url, endpoint)

            response_a = client.get(
                url, headers={"Authorization": f"Bearer {user_a_token}"}
            )
            if response_a.status_code != 200:
                continue

            response_b = client.get(
                url, headers={"Authorization": f"Bearer {user_b_token}"}
            )

            if response_b.status_code == 200:
                if response_b.json() == response_a.json():
                    findings.append({
                        "type": "BOLA",
                        "endpoint": endpoint,
                        "severity": "high",
                        "description": (
                            f"User B can access User A's resource at {endpoint}"
                        ),
                    })
                    print(f"[!] BOLA found: {endpoint}")
            elif response_b.status_code == 403:
                print(f"[+] Properly denied: {endpoint}")

    return findings


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python burp-automation.py <target_url>")
        print("  Set BURP_API_KEY environment variable for authenticated API access")
        sys.exit(1)

    import os

    target = sys.argv[1]
    key = os.environ.get("BURP_API_KEY", "")

    scan_config = ScanConfig(urls=[target], crawl_depth=3)
    burp = BurpAutomation(BurpConfig(api_key=key))

    try:
        task_id = burp.start_scan(scan_config)
        result = burp.wait_for_scan(task_id)
        issues = burp.get_issues(task_id)
        report = burp.generate_report(issues)
        print(report)
    finally:
        burp.close()
