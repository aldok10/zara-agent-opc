# tsconfig: every flag and the bug it prevents

A senior tsconfig for a modern app (Node 24+ / bundler, ESM). Each flag annotated with WHY.

```jsonc
{
  "compilerOptions": {
    // --- Type checking (the strict family) ---
    "strict": true,                          // turns on the 7 strict flags below; non-negotiable
    // strict enables: noImplicitAny, strictNullChecks, strictFunctionTypes,
    // strictBindCallApply, strictPropertyInitialization, noImplicitThis,
    // useUnknownInCatchVariables, alwaysStrict, strictBuiltinIteratorReturn
    "noUncheckedIndexedAccess": true,        // arr[i] is T | undefined, not T. Catches "assumed it exists" bugs
    "exactOptionalPropertyTypes": true,      // { x?: T } means absent OR T, NOT undefined. Distinguishes missing from explicit-undefined
    "noImplicitOverride": true,              // subclass override must say `override`. Catches renamed base methods
    "noFallthroughCasesInSwitch": true,      // forgotten `break` in switch = error
    "noImplicitReturns": true,               // all code paths must return (or none). Catches missing return
    "noPropertyAccessFromIndexSignature": true, // obj.foo vs obj["foo"] consistency for index sigs

    // --- Modules / interop ---
    "module": "nodenext",                    // or "esnext" + bundler. Matches your runtime
    "moduleResolution": "nodenext",          // or "bundler". NEVER "node" (legacy, wrong for ESM)
    "verbatimModuleSyntax": true,            // forces `import type` for types; output matches source exactly. Kills CJS/ESM ambiguity
    "isolatedModules": true,                 // each file transpilable alone. Required for esbuild/swc/babel. Bans const enum, ambiguous re-exports
    "esModuleInterop": true,                 // sane default import of CJS modules
    "resolveJsonModule": true,               // import x from "./data.json"

    // --- Emit ---
    "target": "es2023",                      // match your runtime's support; don't down-level needlessly
    "lib": ["es2023"],                       // + "dom" for browser. Don't include dom in node projects
    "moduleDetection": "force",              // treat every file as a module (no accidental global scripts)
    "noEmit": true,                          // if a bundler emits; tsc is type-check only. Or "outDir" if tsc emits
    "sourceMap": true,
    "declaration": true,                     // for libs
    "isolatedDeclarations": true,            // libs: forces annotated exports so .d.ts generate without full type graph. Faster, parallelizable

    // --- Quality of life ---
    "skipLibCheck": true,                    // pragmatic: skip type-checking .d.ts of deps. Speed win, but hides dep type bugs. Know the tradeoff
    "forceConsistentCasingInFileNames": true,// case-sensitive imports (macOS/Linux parity)
    "allowUnusedLabels": false,
    "allowUnreachableCode": false
  }
}
```

## The flags people get wrong

- **`moduleResolution: "node"`** is legacy and wrong for ESM. Use `"nodenext"` (Node) or `"bundler"` (Vite/esbuild/etc). This single flag causes most "cannot find module" pain.
- **No `verbatimModuleSyntax`** leads to imports being elided or transformed inconsistently across tools. Turn it on; use `import type` deliberately.
- **`skipLibCheck: true` everywhere**: speed win but you inherit any type bug in `node_modules/**/*.d.ts` silently. Fine for apps, riskier for libs.
- **Forgetting `noUncheckedIndexedAccess`**: `strict: true` does NOT include it. Without it, `array[i]` and `record[key]` lie about being defined. This is the highest-value non-strict flag.
- **`exactOptionalPropertyTypes` surprises**: `{ x?: number }` no longer accepts `{ x: undefined }`. Correct, but migrations hit it. Understand before enabling on legacy.

## Monorepo: project references

```jsonc
// root tsconfig.json
{ "files": [], "references": [{ "path": "./packages/core" }, { "path": "./packages/api" }] }
// each package: "composite": true, "declaration": true
```
Build with `tsc --build`. Enables incremental, parallel, correct cross-package builds. Pair with `isolatedDeclarations` for max speed.

## Runtime-specific

- **Bun**: `"moduleResolution": "bundler"`, Bun handles TS directly, `tsc --noEmit` for checking only.
- **Node 24+ native TS**: type stripping runs `.ts` directly; still run `tsc --noEmit` in CI for actual type checking (Node strips, doesn't check). `erasableSyntaxOnly: true` bans enum/namespace/param-properties that Node can't strip.
- **Deno**: has its own config; `strict` on by default.
