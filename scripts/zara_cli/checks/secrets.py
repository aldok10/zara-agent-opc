"""Secret-shaped string scan over tracked files."""
from __future__ import annotations

import re

from ..context import Context
from ..result import Check

SKIP_SUFFIXES = {
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf", ".mp3",
    ".zip", ".gz", ".tgz", ".exe", ".dll", ".so", ".a", ".lib", ".wasm",
    ".db", ".sqlite", ".lock",
}
SKIP_NAMES = {".env.example", "check-secrets.py", "package-lock.json"}

PATTERNS = [
    ("private key block", re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----")),
    ("openai-style key", re.compile(r"\bsk-[A-Za-z0-9]{20,}\b")),
    ("anthropic key", re.compile(r"\bsk-ant-[A-Za-z0-9_-]{20,}\b")),
    ("github token", re.compile(r"\bgh[pousr]_[A-Za-z0-9]{30,}\b")),
    ("aws access key", re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
    ("google api key", re.compile(r"\bAIza[0-9A-Za-z_-]{35}\b")),
    ("slack token", re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{10,}\b")),
    ("bearer literal", re.compile(r"Bearer\s+[A-Za-z0-9._-]{30,}")),
]

# Documented examples, not credentials. Every entry needs a reason.
ALLOW = {
    ("scripts/zara_cli/checks/secrets.py", "aws access key"):
        "AWS documentation example key AKIAIOSFODNN7EXAMPLE, used in the pattern regex test.",
    ("additional-skills/qa-engineer/security-testing/subskills/secrets-detection.md", "aws access key"):
        "AWS documentation example key AKIAIOSFODNN7EXAMPLE, used to teach detection.",
    ("additional-skills/security/penetration-testing/examples/nuclei-template.md", "bearer literal"):
        "Unsigned demo JWT inside a nuclei template example.",
}


def scan(ctx: Context) -> Check:
    hits: list[str] = []
    scanned = 0
    for path in ctx.tracked_files():
        if not path.is_file():
            continue
        if path.name in SKIP_NAMES or path.suffix.lower() in SKIP_SUFFIXES:
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        scanned += 1
        rel = path.relative_to(ctx.root).as_posix()
        for label, regex in PATTERNS:
            for number, line in enumerate(text.splitlines(), 1):
                if regex.search(line) and (rel, label) not in ALLOW:
                    hits.append(f"{rel}:{number}: {label}")

    return Check(
        name="secrets scan",
        ok=not hits,
        detail=f"{scanned} tracked files" + (f"; " + "; ".join(hits[:10]) if hits else ""),
        fix="remove the credential, rotate it, and allowlist only documented examples",
    )
