---
name: context-mode
description: Use when analyzing data without loading raw content into context, batch executing multiple commands, fetching web content as markdown, processing files without reading full content, or checking previous session state after resume
---

# Skill: context-mode

## Context

Use this skill when you need to:
- Analyze, count, filter, compare, search, parse, or transform data
- Fetch web content without raw HTML in context
- Batch multiple commands into one call
- Process files without reading their full content into context
- Check what happened in a previous session after resume

Do NOT use for:
- Editing files (use Read/Edit directly)
- Running tests or builds (use Shell directly)

## Steps

### 1. Think in Code (Always)

Before reading a file for analysis:

```javascript
// ❌ BAD: Read entire file into context (45 KB)
// ✅ GOOD: Process in sandbox, only result in context
ctx_execute("javascript", `
  const fs = require("fs");
  const content = fs.readFileSync("path/to/file", "utf8");
  const lines = content.split("\\n").length;
  const functions = content.match(/function\\s+\\w+/g) || [];
  console.log(JSON.stringify({ lines, functionCount: functions.length, functions }));
`);
```

### 2. Batch Operations

For multiple independent commands:

```
ctx_batch_execute(commands: [
  {label: "file sizes", command: "wc -l src/**/*.ts"},
  {label: "test results", command: "npm test -- --run 2>&1 | tail -20"}
], queries: ["project structure"])
```

### 3. Web Fetching

```javascript
// Fetch and index in one call
ctx_fetch(url: "https://example.com/docs", source: "api-docs")

// Then search the indexed content
ctx_search(queries: ["authentication", "rate limits"], source: "api-docs")
```

### 4. File Processing

```javascript
// Process file without loading into context
ctx_execute_file(path: "src/data.json", language: "javascript", code: `
  const data = JSON.parse(process.argv[1]);
  console.log("Total records:", data.length);
  console.log("Unique categories:", [...new Set(data.map(d => d.category))].length);
`)
```

## Verification

- `ctx stats` — check context savings
- `ctx doctor` — verify tools are registered

## Known Pitfalls

- Don't use ctx_execute for interactive commands (they'll hang)
- Don't use ctx_execute for long-running commands (> 30s timeout)
- ctx_fetch caches for 24h by default; use `ttl: 0` to force refresh
- ctx_search supports multiple queries in one call; use this for efficient follow-ups
