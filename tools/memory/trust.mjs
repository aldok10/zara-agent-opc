// tools/memory/trust.mjs — Trust calibration math (extracted from memory-db.mjs).
//
// Pure functions over a `db` handle. The per-session trust budget is caller-owned
// state passed in as a mutable holder so this module stays stateless.

import { sourceCeiling } from './semantic-store.mjs';

const TRUST_FLOOR = 0.2;
const BUDGET_CAP = 5;

// Adjust trust score for memories recalled in a session. Call after reflect()
// with an outcome to calibrate which memories are actually useful.
//   db      — SQLite handle
//   keys    — memory keys to adjust
//   outcome — 'success' (+0.1) | 'failure' (-0.15) | anything else (no-op)
//   budget  — mutable holder { value } capping positive adjustments per session
export function adjustTrust(db, keys, outcome, budget) {
  const delta = outcome === 'success' ? 0.1 : outcome === 'failure' ? -0.15 : 0.0;
  if (!delta || !keys.length) return { adjusted: 0 };
  if (delta > 0 && budget.value >= BUDGET_CAP) return { adjusted: 0, budgetExceeded: true };
  const getRow = db.prepare('SELECT source, trust_score FROM semantic WHERE key = ?');
  const stmt = db.prepare('UPDATE semantic SET trust_score = ? WHERE key = ?');
  let adjusted = 0;
  for (const key of keys) {
    const row = getRow.get(key);
    if (!row) continue;
    const ceiling = sourceCeiling(row.source);
    const newScore = Math.max(TRUST_FLOOR, Math.min(ceiling, (row.trust_score ?? 0.5) + delta));
    stmt.run(newScore, key);
    adjusted++;
  }
  if (delta > 0 && adjusted) budget.value++;
  return { adjusted, delta };
}
