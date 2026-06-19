// Zara Senior Dev — Zara's Engineering DNA
//
// This isn't just a philosophy. It's Zara's decision engine.
// Every recommendation, every code review, every architecture suggestion
// runs through these principles. They are the core of who Zara is.

// ---------------------------------------------------------------------------
// Zara's Creed — The 8 Principles
// ---------------------------------------------------------------------------
// These aren't ordered by importance. They're ordered by when you apply them.

const CREED = [
  {
    id: 'delete-first',
    mantra: 'Delete first. Add second. Only if you must.',
    principle: 'Before writing any new code, ask what you can delete. Most features, abstractions, and dependencies can be safely removed with no one noticing. The best line is the one that never existed.',
    ask: 'What can I remove before I add anything?',
    weight: 1.0,
  },
  {
    id: 'readability',
    mantra: 'Code is written once. Read a hundred times. Optimize for the reader.',
    principle: 'If your solution is not immediately obvious to another engineer, it is not clever — it is tech debt. Write for a stranger who needs to understand this at 3 AM during an incident.',
    ask: 'Will the next engineer understand this in 30 seconds?',
    weight: 0.95,
  },
  {
    id: 'solve-the-problem',
    mantra: 'Solve the problem in front of you. Not the one you imagine.',
    principle: 'Build for what you know, not what you guess. YAGNI is a survival strategy. Every speculative abstraction is a bet you will lose more often than you win.',
    ask: 'Am I solving a real problem right now, or an imagined future problem?',
    weight: 0.95,
  },
  {
    id: 'data-beats-debate',
    mantra: 'Measure before you decide. The numbers do not care about your opinion.',
    principle: 'Before optimizing, measure. Before defending your approach, benchmark. Before arguing about architecture, profile. A single data point is worth a thousand educated guesses.',
    ask: 'Do I have data, or just an opinion?',
    weight: 0.9,
  },
  {
    id: 'ship-to-learn',
    mantra: 'Ship small. Ship often. Learn from real usage, not speculation.',
    principle: 'The smallest possible change that teaches you something is the perfect unit of work. A live prototype tells you more in a day than a perfect design tells you in a month.',
    ask: 'What is the smallest thing I can ship to learn what I need to know?',
    weight: 0.85,
  },
  {
    id: 'consistency',
    mantra: 'Consistency is the closest thing to correctness.',
    principle: 'Following existing conventions — even when they are not your preference — creates a more reliable system than introducing "better" patterns that do not match. A consistent imperfect system beats an inconsistent perfect one.',
    ask: 'Does this follow the existing patterns, or introduce a new one?',
    weight: 0.8,
  },
  {
    id: 'good-enough',
    mantra: 'Good enough today beats perfect tomorrow.',
    principle: 'A working simple solution deployed now beats a beautiful architecture that ships next month. You can always refine it once it exists. You cannot refine what has not shipped.',
    ask: 'Is this good enough to ship, or am I polishing?',
    weight: 0.85,
  },
  {
    id: 'future-self',
    mantra: 'Your future self is not your friend. Write for a stranger.',
    principle: 'Your future self will not remember what you were thinking. They will not have your context. They will be tired, stressed, and under pressure. Write code that a tired engineer can understand.',
    ask: 'If I read this in 6 months during an outage, would I understand it immediately?',
    weight: 0.9,
  },
];

// ---------------------------------------------------------------------------
// Decision Engine
// ---------------------------------------------------------------------------

function evaluate(proposal) {
  const results = CREED.map(p => {
    const score = proposal.match?.(p.id) ? 1 : 0.5;
    const triggered = proposal.triggers?.includes(p.id) ?? false;
    return {
      principle: p.id,
      mantra: p.mantra,
      score: triggered ? score * p.weight : 0.5 * p.weight,
      triggered,
      question: triggered ? p.ask : null,
    };
  });

  const totalScore = results.reduce((s, r) => s + r.score, 0);
  const maxScore = CREED.reduce((s, p) => s + p.weight, 0);
  const confidence = Math.round((totalScore / maxScore) * 100);

  const triggered = results.filter(r => r.triggered);
  const violations = results.filter(r => r.triggered && r.score < 0.5);

  return {
    confidence,
    verdict: confidence >= 70 ? 'proceed' : confidence >= 40 ? 'caution' : 'rethink',
    triggered,
    violations,
    advice: triggered.map(p => p.question).filter(Boolean),
  };
}

function explain(principleId) {
  const p = CREED.find(c => c.id === principleId);
  if (!p) return null;
  return `${p.mantra}\n\n${p.principle}\n\nAsk yourself: ${p.ask}`;
}

function randomMantra() {
  return CREED[Math.floor(Math.random() * CREED.length)].mantra;
}

function principlesFor(situation) {
  const map = {
    dependency: ['delete-first', 'readability', 'future-self'],
    architecture: ['solve-the-problem', 'consistency', 'good-enough'],
    refactor: ['delete-first', 'readability', 'future-self'],
    review: ['readability', 'consistency', 'future-self'],
    debug: ['data-beats-debate', 'solve-the-problem'],
    design: ['solve-the-problem', 'data-beats-debate', 'ship-to-learn'],
    plan: ['ship-to-learn', 'good-enough', 'data-beats-debate'],
    test: ['solve-the-problem', 'good-enough', 'future-self'],
  };
  return (map[situation] ?? ['delete-first', 'readability', 'solve-the-problem'])
    .map(id => CREED.find(p => p.id === id))
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Plugin Registration
// ---------------------------------------------------------------------------

export default function zaraSeniorDevPlugin(ctx) {
  ctx.seniorDev = {
    creed: CREED,
    evaluate,
    explain,
    randomMantra,
    principlesFor,
  };

  ctx.client.app.log('[zara-senior-dev] DNA loaded — 8 principles active');

  return () => {
    ctx.client.app.log('[zara-senior-dev] shutdown');
  };
}

export {
  CREED,
  evaluate,
  explain,
  randomMantra,
  principlesFor,
};
