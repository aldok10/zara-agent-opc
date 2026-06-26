// Zara Token/Cost Telemetry (Issue #10)
// Tracks per-turn token usage, cost estimates, and per-agent breakdown.

import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import os from 'os';

const HOME = path.join(os.homedir(), '.zara');
const DB_PATH = path.join(HOME, 'telemetry.db');

// Cost per 1M tokens (USD) — update as pricing changes
const PRICING = {
  input: 3.0,    // avg input price
  output: 15.0,  // avg output price
  cached: 0.30,  // cached input discount
};

let _db = null;

function getDb() {
  if (_db) return _db;
  fs.mkdirSync(HOME, { recursive: true });
  _db = new DatabaseSync(DB_PATH);
  _db.exec('PRAGMA journal_mode=WAL');
  _db.exec(`CREATE TABLE IF NOT EXISTS turns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts TEXT NOT NULL DEFAULT (datetime('now')),
    tokens_in INTEGER NOT NULL DEFAULT 0,
    tokens_out INTEGER NOT NULL DEFAULT 0,
    cached_tokens INTEGER NOT NULL DEFAULT 0,
    tools_called INTEGER NOT NULL DEFAULT 0,
    agent TEXT NOT NULL DEFAULT 'zara',
    model TEXT NOT NULL DEFAULT 'unknown',
    session_id TEXT
  )`);
  return _db;
}

export function recordTurn({ tokens_in = 0, tokens_out = 0, tools_called = 0, agent = 'zara', model = 'unknown', cached_tokens = 0, session_id = null } = {}) {
  const db = getDb();
  db.prepare('INSERT INTO turns (tokens_in, tokens_out, cached_tokens, tools_called, agent, model, session_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run(tokens_in, tokens_out, cached_tokens, tools_called, agent, model, session_id);
  return true;
}

export function getMetrics(period = 'today') {
  const db = getDb();
  const where = period === 'today' ? "WHERE date(ts) = date('now')" : period === 'session' ? "WHERE session_id = (SELECT session_id FROM turns ORDER BY id DESC LIMIT 1)" : '';

  const totals = db.prepare(`SELECT COUNT(*) as turns, COALESCE(SUM(tokens_in),0) as total_in, COALESCE(SUM(tokens_out),0) as total_out, COALESCE(SUM(cached_tokens),0) as total_cached, COALESCE(SUM(tools_called),0) as total_tools FROM turns ${where}`).get();

  const agentRows = db.prepare(`SELECT agent, COUNT(*) as turns, SUM(tokens_in) as t_in, SUM(tokens_out) as t_out FROM turns ${where} GROUP BY agent`).all();
  const by_agent = {};
  for (const r of agentRows) by_agent[r.agent] = { turns: r.turns, tokens_in: r.t_in, tokens_out: r.t_out };

  const billable_in = totals.total_in - totals.total_cached;
  const est_cost_usd = (billable_in * PRICING.input + totals.total_out * PRICING.output + totals.total_cached * PRICING.cached) / 1_000_000;
  const cache_hit_ratio = totals.total_in > 0 ? totals.total_cached / totals.total_in : 0;

  return { ...totals, by_agent, est_cost_usd: Math.round(est_cost_usd * 10000) / 10000, cache_hit_ratio: Math.round(cache_hit_ratio * 100) / 100 };
}

export function cleanup() {
  try { const db = getDb(); db.exec("DELETE FROM turns WHERE date(ts) = date('now')"); } catch {}
}

export function close() {
  if (_db) { _db.close(); _db = null; }
}
