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

## AI-Era Context (2026)

**Local LLM Evolution**: Ollama became standard for local inference (30M+ downloads). vLLM remains gold standard for production serving. Both support OpenAI-compatible APIs.

**Tool Calling on Local Models**: 2026 breakthrough: local models (Llama 3.3, Qwen 2.5, DeepSeek) have native tool calling. MCP bridge connects them to Claude-style tools without provider lock-in.

**Cost vs Privacy**: Frontier models (Claude, GPT-4) are better but cost $10-50/M tokens. Local models (70B quantized) run free on consumer hardware. Privacy-sensitive work (proprietary code, PII) stays local.

**Latency Trade-off**: Cloud: 200-500ms TTFT, 50-100 tokens/s. Local (M3 Max): 2-5s TTFT, 20-40 tokens/s. Local is viable for non-interactive workflows (batch processing, evals, embedding).

**Bridge Architecture**: `vllm_mcp_bridge.py` translates OpenAI function calling → MCP HTTP protocol. This enables any local model to use Claude Desktop's MCP tool ecosystem.

**Use Cases 2026**: 
- Code review (privacy), embedding generation (cost), eval harnesses (volume), agentic workflows (iteration speed).
- NOT for: real-time chat, complex reasoning (use o1/Claude 3.5), multimodal (local models lag).
