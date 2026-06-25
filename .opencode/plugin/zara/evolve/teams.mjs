// Agent Teams — reusable team compositions for common workflows
// Invoke via swarm/dispatch with team name

export const TEAMS = {
  review: {
    name: 'Review Team',
    agents: ['code-reviewer', 'security-reviewer', 'testing-lead'],
    goal: 'Comprehensive code review: quality + security + test coverage',
    handoff: 'parallel',
  },
  ship: {
    name: 'Ship Team',
    agents: ['implementation', 'code-reviewer', 'testing-lead'],
    goal: 'Implement, review, and verify before shipping',
    handoff: 'sequential',
  },
  design: {
    name: 'Design Team',
    agents: ['architect', 'code-reviewer', 'loop-engineer'],
    goal: 'Architecture design with quality and iteration review',
    handoff: 'sequential',
  },
  security: {
    name: 'Security Team',
    agents: ['security-reviewer', 'code-reviewer'],
    goal: 'Security audit: threat model + implementation review',
    handoff: 'parallel',
  },
  full: {
    name: 'Full SDLC',
    agents: ['architect', 'implementation', 'code-reviewer', 'security-reviewer', 'testing-lead', 'delivery-lead'],
    goal: 'Full lifecycle: design → implement → review → secure → test → ship',
    handoff: 'sequential',
  },
};

/** Get team by name */
export function getTeam(name) {
  return TEAMS[name] || null;
}

/** List available teams */
export function listTeams() {
  return Object.entries(TEAMS).map(([key, t]) => ({
    key,
    name: t.name,
    agents: t.agents,
    handoff: t.handoff,
  }));
}
