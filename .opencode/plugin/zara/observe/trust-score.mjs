// Patch Trust Scoring — rates edit risk, gates risky changes via HITL
// Factors: size (lines changed), scope (files), type (test/config/src), agent history

const THRESHOLDS = { low: 0.7, medium: 0.4, high: 0.0 };

/** Score a file edit. Returns 0.0 (dangerous) to 1.0 (safe). */
export function scorePatch({ filePath, linesChanged, toolName, agent }) {
  let score = 1.0;

  // Size penalty: more lines = less trust
  if (linesChanged > 100) score -= 0.3;
  else if (linesChanged > 50) score -= 0.2;
  else if (linesChanged > 20) score -= 0.1;

  // Scope: production code is riskier
  if (/\.(env|key|pem|secret)/.test(filePath)) score -= 0.5;
  else if (/(?:src|lib|pkg|internal)\//.test(filePath)) score -= 0.1;
  else if (/(?:test|spec|__test__)/.test(filePath)) score += 0.1;
  else if (/(?:docs?|readme|changelog)/i.test(filePath)) score += 0.2;

  // Config files: moderate risk
  if (/(?:\.ya?ml|\.json|\.toml|Dockerfile|docker-compose)$/.test(filePath)) score -= 0.05;

  // Infrastructure/deploy: high risk
  if (/(?:terraform|\.tf|k8s|deploy|infra|\.github\/workflows)/.test(filePath)) score -= 0.2;

  return Math.max(0, Math.min(1.0, score));
}

/** Classify trust level */
export function trustLevel(score) {
  if (score >= THRESHOLDS.low) return 'safe';
  if (score >= THRESHOLDS.medium) return 'review';
  return 'dangerous';
}
