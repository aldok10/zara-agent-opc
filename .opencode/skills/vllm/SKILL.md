---
name: vllm
description: "Local LLM Orchestration: Ollama/vLLM + MCP bridge configuration. Use when running local LLMs, tool calling with local models, or testing AI-Agent bridges."
---

# Local LLM Orchestration (vLLM/Ollama)

Connect local LLMs (Ollama, vLLM) with MCP tools via the bridge.

## Scope

- HANDLES: local LLM config (`vllm-config.json`), bridge execution (`vllm_mcp_bridge.py`), interactive testing.
- DEFERS: system design to `system-design`; agent prompt engineering to `skill-creator`.

## First Action

1. Verify local Ollama/vLLM is running (check `curl http://localhost:11434/v1/models`).
2. Run `vllm_mcp_bridge.py` from `~/Apps/sam/personal/vllm/` if testing bridge connection.

## Constraints

- Config JSON must mirror the `engine/server` schema exactly.
- Bridge bridge-connects LLM function calling to MCP HTTP server (localhost:8081).
- Always set `OLLAMA_URL` env if non-default.
- Use `finetune_mlx_lora.py` only if the model supports it.

## Verification

1. `api-test.sh` passes (model chat completion returns correct structure).
2. Bridge correctly routes function-call request to MCP tool.
