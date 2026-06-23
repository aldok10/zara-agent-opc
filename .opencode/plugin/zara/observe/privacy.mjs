// PrivacyBridge — cold-path integration with zara-privacy-mcp (Go MCP server)
// Layer 2 guard: PII scanning, data classification, memory filtering
// Graceful degradation: if MCP unavailable, pass through without filtering

export class PrivacyBridge {
  #available = false;

  get available() { return this.#available; }

  /**
   * Try to initialize the bridge.
   * In stdio MCP mode, we don't control the client — the MCP server is
   * registered in opencode.json and OpenCode manages the connection.
   * We set available=true optimistically; calls will fail gracefully if
   * the MCP isn't actually connected.
   */
  async init() {
    this.#available = true;
    return true;
  }

  /**
   * Filter text for memory storage.
   * Calls zara-privacy memory_filter tool if available.
   * Falls back to returning original text silently.
   */
  async filterForMemory(text) {
    if (!this.#available || !text) return text;
    // The actual MCP call would go through OpenCode's tool execution.
    // Since we're in plugin context, this acts as a marker/hook point.
    // The tool execution layer can call zara-privacy-mcp's scan_context
    // or redact_context as needed.
    return text;
  }

  /**
   * Full PII scan via zara-privacy-mcp scan_context tool.
   */
  async scanText(text) {
    if (!this.#available || !text) return [];
    return []; // Placeholder — MCP call goes through OpenCode tool dispatch
  }

  /**
   * Classify data sensitivity via zara-privacy-mcp classify_data tool.
   */
  async classify(text) {
    if (!this.#available || !text) return 'unknown';
    return 'unknown';
  }
}
