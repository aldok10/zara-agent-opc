# Release Checklist Generator

## Prompt Template

Generate release checklist for: `[feature/service name]`
Release type: `[canary | full | hotfix | train]`
Risk level: `[low | medium | high | critical]`

## Checklist Structure

### Pre-Release
- [ ] Rollback owner assigned: ___
- [ ] Rollback method confirmed: [flag off | redeploy | revert]
- [ ] Feature flag created with kill switch tested
- [ ] Monitoring dashboard open with baseline captured
- [ ] Release notes reviewed and approved
- [ ] Dependent services notified (if applicable)
- [ ] Database migration is additive-only (if applicable)

### During Release
- [ ] Canary stage 1 (1%): metrics within threshold for ___min
- [ ] Canary stage 2 (5%): metrics within threshold for ___min
- [ ] Canary stage 3 (25%): metrics within threshold for ___min
- [ ] Full rollout (100%): stable for 24h
- [ ] No alerts firing related to release

### Post-Release
- [ ] Flag cleanup ticket created (due: ___ sprint)
- [ ] Release announced in #releases channel
- [ ] Documentation updated (if API change)
- [ ] Metrics baseline updated for next release
- [ ] Retrospective scheduled (if issues encountered)
