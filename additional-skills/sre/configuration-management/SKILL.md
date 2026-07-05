---
name: configuration-management
description: "Infrastructure configuration at scale: Ansible, Chef, Puppet, Salt. Idempotent convergent state management."
---

# Configuration Management

## Scope

Ansible playbooks/roles/collections, Chef cookbooks, Puppet manifests, Salt states. Configuration drift detection, secret management, inventory patterns, and testing infrastructure code.

## First Action

Identify the CM tool in use (check for `ansible.cfg`, `Puppetfile`, `Berksfile`, `salt/top.sls`). Read the inventory/node classification to understand the target environment before making changes.

## Constraints

1. All configuration must be idempotent -- running twice produces identical state
2. Secrets managed via vault/encrypted pillars/data bags, never plaintext
3. Role/module reuse over inline tasks
4. Test with molecule/kitchen/serverspec before applying to production
5. Pin versions for packages, collections, and modules
6. Use inventory groups/roles for environment separation (dev/staging/prod)
7. Tag tasks for selective execution
8. Handlers for service restarts, not inline restarts
9. Variables scoped to narrowest context (host > group > all)
10. Fail fast with pre-checks before destructive operations
11. Lint all configs (ansible-lint, foodcritic, puppet-lint)
12. Document role dependencies explicitly
13. Use check/dry-run mode before apply in CI
14. Limit blast radius with serial/batch execution
15. Log all changes with audit trail

## DO NOT

1. Store secrets in version control unencrypted
2. Use shell/command modules when native modules exist
3. Hardcode hostnames or IPs in tasks
4. Skip testing and push directly to production
5. Use `ignore_errors: true` without explicit justification
6. Mix multiple CM tools in the same infrastructure without clear boundaries
7. Run playbooks as root when privilege escalation is available
8. Disable idempotency checks for convenience
9. Use deprecated modules without migration plan

## Route to Subskill

| Signal | Subskill |
|--------|----------|
| Ansible playbook/role design | knowledge/ansible-patterns.md |
| Drift detection, convergence | knowledge/idempotency.md |
| Role structure example | examples/ansible-role.yaml |
| Code review for CM | tools/playbook-review-prompt.md |

## Verification

- [ ] All tasks are idempotent (second run reports 0 changes)
- [ ] Secrets encrypted and not in git history
- [ ] Linter passes clean
- [ ] Molecule/test-kitchen tests pass
- [ ] Dry-run shows expected changes only
- [ ] Variables documented with defaults
- [ ] Handlers triggered correctly
- [ ] Inventory structure matches environment topology

## Knowledge

- knowledge/ansible-patterns.md -- playbooks, roles, collections, vault
- knowledge/idempotency.md -- convergent configuration, drift detection

## AI-Era Context (2026)

- LLM-assisted playbook generation requires careful review -- models often produce non-idempotent shell tasks or miss handler chains.
- Use structured prompts that specify the target module and expected state.
- AI-generated inventory should be validated against actual infrastructure via dynamic inventory plugins.
- Drift detection increasingly integrates with observability platforms for auto-remediation pipelines.
- Ansible-core 2.17+, ansible-lint 25.x, Molecule 25.x with Podman.

## Related Skills

- system-design (infrastructure architecture)
- security-engineering (secret management, hardening)
- testing-strategy (infrastructure test patterns)
