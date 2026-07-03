// Guard Service — secret detection + prompt injection screening

import { FileStore, SECRET_PATTERN } from '../infra/store.mjs';
import { matchInjection } from './patterns.mjs';

export class GuardService {
  #store = new FileStore('guardrails');

  /**
   * Check text for security issues (secrets + prompt injection).
   * Returns structured issue objects with type, label, risk, and matched snippet.
   */
  check(text) {
    if (!text) return [];
    const issues = [];

    // Layer 1a: Secret detection
    if (SECRET_PATTERN.test(text)) {
      issues.push({ type: 'secret', label: 'credential_leak', risk: 'high', matched: text.match(SECRET_PATTERN)?.[0]?.slice(0, 80) || '' });
    }

    // Layer 1b: Prompt injection detection
    issues.push(...matchInjection(text));

    if (issues.length) {
      this.#store.appendLine('incidents.jsonl', {
        type: issues.map(i => i.type).join(','),
        risk: issues.some(i => i.risk === 'high') ? 'high' : issues.some(i => i.risk === 'medium') ? 'medium' : 'low',
        issues,
        textPreview: text.slice(0, 200),
        ts: new Date().toISOString(),
      });
    }
    return issues;
  }

  /**
   * Quick check that only tests for secrets (for redaction).
   * Doesn't log incidents — used in hot path for output filtering.
   */
  hasSecret(text) {
    return SECRET_PATTERN.test(text);
  }

  redact(text) {
    if (!text) return text;
    return text.replace(new RegExp(SECRET_PATTERN.source, 'gi'), '[REDACTED]');
  }

  incidents() { return this.#store.readLines('incidents.jsonl', 50); }
}
