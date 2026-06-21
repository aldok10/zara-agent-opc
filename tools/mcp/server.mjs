/**
 * MCP Server — JSON-RPC 2.0 over stdio.
 * Implements the Model Context Protocol for tool registration and invocation.
 */
export class McpServer {
  /** @param {string} name @param {string} version */
  constructor(name, version) {
    this.name = name;
    this.version = version;
    this.tools = {};
    this._toolsCache = null;
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
        const tool = this.tools[params.name];
        if (!tool) return { jsonrpc: '2.0', id, error: { code: -32601, message: `Unknown tool: ${params.name}` } };
        try {
          const result = await tool.handler(params.arguments || {});
          return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: result }] } };
        } catch (e) {
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
      let idx;
      while ((idx = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!line) continue;
        try {
          const req = JSON.parse(line);
          this.handle(req).then(res => { if (res) process.stdout.write(JSON.stringify(res) + '\n'); });
        } catch (e) {
          process.stderr.write(`Parse error: ${e.message}\n`);
        }
      }
    });
    process.stdin.on('end', () => process.exit(0));
  }
}
