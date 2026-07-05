# AI Security & Guardrails

## Prompt injection
Attacker manipulates LLM behavior via input. Two types:
- **Direct**: user input contains "ignore previous instructions." Mitigate with input sanitization, instruction hierarchy, output validation.
- **Indirect**: retrieved content (RAG docs, web pages, emails) carries injections. Mitigate with content filtering, trusted-source validation, sandboxed execution.

## Defense layers (defense in depth)
1. **Input filtering**: detect injection patterns, PII redaction, content classification
2. **Instruction hierarchy**: system prompt has highest authority; user input cannot override it
3. **Output validation**: check format, content policy, no PII leakage, no harmful content
4. **Tool-call validation**: whitelist allowed actions, rate-limit destructive ops, require confirmation
5. **Monitoring**: log anomalies, detect unusual patterns, alert on policy violations

## PII handling
- Never log full prompts containing PII  --  redact before logging
- Use token IDs, not raw values
- Comply with GDPR / CCPA

## Data poisoning
Malicious training/RAG data skews outputs. Mitigate: validate data sources, audit the RAG corpus, monitor output quality drift.

## Exfiltration
Model tricked into revealing system prompt, RAG sources, or internal data. Mitigate: output filtering, keep secrets out of context entirely, monitor for unusual output patterns.

## Guardrail frameworks
- **Guardrails AI**, **NeMo Guardrails** (NVIDIA), **LlamaGuard**, custom rule engines

## Red teaming
Regularly test with adversarial inputs. Automate with **Garak** and custom suites. Include in CI.

## Supply chain
Validate model sources, pin model versions, audit MCP servers/tools, review third-party prompts.

## Compliance
- **SOC2**: audit trails, access controls
- **HIPAA**: PHI in prompts
- **GDPR**: right to deletion of training data

## Anti-patterns
- No input validation
- Trusting all retrieved content
- Logging PII
- No output filtering
- Single layer of defense
- No red teaming
