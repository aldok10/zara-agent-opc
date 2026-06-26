/**
 * MCP Server — JSON-RPC 2.0 over stdio.
 * Implements the Model Context Protocol for tool registration and invocation.
 */
import fs from 'fs';
import path from 'path';
import os from 'os';

const LOG_DIR = path.join(os.homedir(), '.zara', 'mcp-traces');
const LOG_FILE = path.join(LOG_DIR, `${new Date().toISOString().split('T')[0]}.jsonl`);

function ensureDir() { fs.mkdirSync(LOG_DIR, { recursive: true }); }

function logCall(toolName, args, success, duration, resultPreview) {
  try {
    ensureDir();
    const entry = JSON.stringify({
      ts: new Date().toISOString(),
      tool: toolName,
      args: Object.keys(args || {}),
      success,
      duration,
      result: resultPreview,
    }) + '\n';
    fs.appendFileSync(LOG_FILE, entry, 'utf-8');
  } catch (e) {
    // Silent — logging should never break the server
  }
}

export class McpServer {
  /** @param {string} name @param {string} version */
  constructor(name, version) {
    this.name = name;
    this.version = version;
    this.tools = {};
    this._toolsCache = null;
    // Rate limiter: sliding window per tool, max 120 calls/minute
    this._callLog = [];
    this._rateLimit = 120;
    this._rateWindow = 60_000;
  }

  /** Returns true if rate limit exceeded */
  _isRateLimited() {
    const now = Date.now();
    this._callLog = this._callLog.filter(t => now - t < this._rateWindow);
    if (this._callLog.length >= this._rateLimit) return true;
    this._callLog.push(now);
    return false;
  }

  /** @param {Record<string, {description: string, inputSchema: object, handler: Function}>} toolMap */
  register(toolMap) {
    Object.assign(this.tools, toolMap);
    this._toolsCache = null;
  }

  /** @param {Array<Record<string, object>>} modules */
  registerAll(modules) {
    for (const mod of modules) this.register(mod);
  }

  /** @returns {Array<{name: string, description: string, inputSchema: object}>} */
  get toolsList() {
    if (!this._toolsCache) {
      this._toolsCache = Object.entries(this.tools).map(([name, t]) => ({
        name, description: t.description, inputSchema: t.inputSchema,
      }));
    }
    return this._toolsCache;
  }

  /** @param {object} req — JSON-RPC 2.0 request @returns {Promise<object|null>} */
  async handle(req) {
    if (!req || req.jsonrpc !== '2.0') {
      return { jsonrpc: '2.0', id: req?.id ?? null, error: { code: -32600, message: 'Invalid Request: missing jsonrpc field' } };
    }
    const { method, params, id } = req;
    switch (method) {
      case 'initialize':
        return { jsonrpc: '2.0', id, result: { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: this.name, version: this.version } } };
      case 'tools/list':
        return { jsonrpc: '2.0', id, result: { tools: this.toolsList } };
      case 'tools/call': {
        if (this._isRateLimited()) {
          return { jsonrpc: '2.0', id, error: { code: -32000, message: 'Rate limited: max 120 tool calls per minute' } };
        }
        const tool = this.tools[params.name];
        if (!tool) {
          logCall(params.name, params.arguments, false, 0, 'unknown_tool');
          return { jsonrpc: '2.0', id, error: { code: -32601, message: `Unknown tool: ${params.name}` } };
        }
        const start = Date.now();
        try {
          const result = await tool.handler(params.arguments || {});
          const duration = Date.now() - start;
          const preview = typeof result === 'string' ? result.slice(0, 60) : JSON.stringify(result).slice(0, 60);
          logCall(params.name, params.arguments, true, duration, preview);
          return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result, null, 2) }] } };
        } catch (e) {
          const duration = Date.now() - start;
          logCall(params.name, params.arguments, false, duration, `error: ${e.message}`);
          return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true } };
        }
      }
      case 'notifications/initialized':
        return null;
      default:
        if (id !== undefined) return { jsonrpc: '2.0', id, error: { code: -32601, message: `Unknown method: ${method}` } };
        return null;
    }
  }

  /** Start listening on stdin for newline-delimited JSON-RPC messages. */
  listen() {
    let buffer = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk) => {
      buffer += chunk;
      if (buffer.length > 10_000_000) { buffer = ''; process.stderr.write('[mcp] buffer overflow, flushing\n'); return; }
      let idx;
      while ((idx = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!line) continue;
        try {
          const req = JSON.parse(line);
          this.handle(req).then(res => { if (res) process.stdout.write(JSON.stringify(res) + '\n'); }).catch(e => process.stderr.write(`[mcp] unhandled: ${e.message}\n`));
        } catch (e) {
          process.stderr.write(`Parse error: ${e.message}\n`);
        }
      }
    });
    process.stdin.on('end', () => process.exit(0));
  }
}
