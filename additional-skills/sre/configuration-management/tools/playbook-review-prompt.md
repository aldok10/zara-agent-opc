# Playbook Review Prompt

## Usage

Feed this prompt along with the Ansible code to review. Replace `{CODE}` with the actual playbook/role content.

## Prompt

```
You are an Ansible expert reviewer. Analyze the following Ansible code for quality, security, and correctness.

CODE TO REVIEW:
{CODE}

Review against these criteria:

1. IDEMPOTENCY
   - Are all tasks idempotent? Flag shell/command usage without creates/removes.
   - Would a second run report 0 changes?
   - Any tasks that append to files or use non-deterministic values?

2. SECURITY
   - Are secrets handled via vault or lookup plugins?
   - File permissions appropriate (no world-readable secrets)?
   - Privilege escalation scoped narrowly?
   - No plaintext credentials in variables or templates?

3. BEST PRACTICES
   - FQCN used for all modules?
   - Tasks tagged for selective execution?
   - Handlers used for service restarts (not inline)?
   - Variables in defaults/ vs vars/ used correctly?
   - Role dependencies declared in meta/?

4. RELIABILITY
   - Pre-checks before destructive operations?
   - Health checks after deployments?
   - Serial/batch execution for rolling updates?
   - Error handling with block/rescue where appropriate?
   - Retries on network-dependent tasks?

5. MAINTAINABILITY
   - Clear task names describing intent?
   - DRY -- no repeated blocks that should be loops?
   - Variables documented with sensible defaults?
   - Separation of concerns across task files?

OUTPUT FORMAT:
- CRITICAL: Issues that will cause failures or security problems
- WARNING: Issues that harm maintainability or violate best practices
- SUGGESTION: Optional improvements
- SUMMARY: Overall assessment in 2-3 sentences

For each finding, provide the specific task name/line and a corrected example.
```
