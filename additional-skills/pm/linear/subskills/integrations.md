# Integrations

## Purpose

Connect Linear to dev workflow. Automate state transitions. Reduce manual updates.

## GitHub/GitLab Auto-Link

Setup:
1. Install Linear GitHub app (Settings > Integrations > GitHub).
2. Link repos to teams. Each team maps to 1+ repos.
3. Branch naming: `<username>/lin-<issue-id>-<slug>` auto-links.
4. PR description: include `LIN-123` or `Fixes LIN-123` for auto-link.

State transitions from git:
- Branch created → In Progress
- PR opened → In Review (if custom state exists)
- PR merged → Done (auto-close issue)
- PR closed without merge → no state change

## Slack Integration

Channel routing:
- `#eng-updates`: cycle start/end, project milestones
- `#triage`: new Urgent/High issues, unassigned alerts
- `#team-<name>`: team-specific notifications

Setup: Settings > Integrations > Slack. Map notification types to channels.

Key notifications:
- Issue assigned to you → DM
- Issue status changed → team channel
- Urgent created → #triage
- Cycle summary → #eng-updates (weekly)

## Linear API (GraphQL)

Endpoint: `https://api.linear.app/graphql`
Auth: `Authorization: Bearer <api-key>` (Settings > API > Personal API keys)

Rate limits: 1500 req/hour for API keys, 60 req/min burst.

Common automation patterns:
- Auto-label issues from specific sources
- Sync priority from external systems
- Bulk update status on deployment
- Create issues from alerts/monitors

## Webhook Events

Setup: Settings > API > Webhooks. Events:
- `Issue.create`, `Issue.update`, `Issue.remove`
- `Comment.create`, `Comment.update`
- `Cycle.update`, `Project.update`

Payload: JSON with `action`, `data`, `type`, `createdAt`.

Use cases:
- Trigger CI/CD on status change to "Ready for Deploy"
- Notify external systems on issue close
- Sync status to customer-facing tools

## Verification

- [ ] PRs auto-link to issues
- [ ] Merged PR closes issue automatically
- [ ] Slack notifications reach correct channels
- [ ] Webhook responds to status changes
