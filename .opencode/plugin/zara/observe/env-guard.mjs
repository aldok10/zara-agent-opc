// env-guard.mjs — Prevent .env file leaks
import { createHash } from 'node:crypto';

const ENV_PATTERN = /(?:^|[/\\])\.env(?:\.[^/\\]*)?$/i;
const SAFE_FILES = /\.env\.example$|\.env\.template$|\.env\.sample$/i;

export function checkEnvAccess(toolName, args) {
  if (!args) return null;
  const filePath = args.filePath || args.path || args.file || '';
  if (!filePath || !ENV_PATTERN.test(filePath)) return null;
  if (SAFE_FILES.test(filePath)) return null;

  if (toolName === 'read' || toolName === 'edit' || toolName === 'write') {
    return {
      isError: true,
      output: `⚠️ Blocked: Cannot directly access ${filePath}. Use env inspection instead.\nReason: .env files may contain secrets. Reference keys by name, not value.`
    };
  }
  return null;
}
