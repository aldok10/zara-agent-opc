---
name: zara-ctx
description: Use when running code in sandboxed subprocesses, batch executing commands, or fetching URLs as markdown without raw HTML in context
---

# Skill: zara-ctx - Context Sandbox Tools

## Context

Use this skill when you need to:
- Analyze, count, filter, or transform data without loading raw content into context
- Process files without reading their full content
- Run multiple commands in one batch call
- Fetch web content without raw HTML in context

## Available Tools

### ctx_execute(language, code)
Run code in a sandboxed subprocess. Only stdout enters your context.

```javascript
// Count functions in a file
ctx_execute("javascript", `
  const fs = require("fs");
  const content = fs.readFileSync("src/app.ts", "utf8");
  const fnCount = (content.match(/function\\s+\\w+/g) || []).length;
  console.log("Functions:", fnCount);
`)
```

### ctx_execute_file(path, language, code)
Process a file in sandbox. The file path is injected as `__FILE__` and `__DIR__`.

```javascript
// Analyze a data file
ctx_execute_file("src/data.json", "javascript", `
  const fs = require("fs");
  const data = JSON.parse(fs.readFileSync(__FILE__, "utf8"));
  console.log("Records:", data.length);
  console.log("Categories:", [...new Set(data.map(d => d.category))].length);
`)
```

### ctx_batch_execute(commands)
Run multiple commands in one call. Each command: `{label, command, language?}`.

```
ctx_batch_execute([
  {label: "file sizes", command: "wc -l src/**/*.ts"},
  {label: "test results", command: "npm test 2>&1 | tail -5"}
])
```

### ctx_fetch(url)
Fetch a URL and return content as markdown. Raw HTML never enters context.

## The Core Rule

**Program the analysis, don't read it.** One `ctx_execute` replaces ten `Read` calls. Data stays in sandboxes, not in your context window.
