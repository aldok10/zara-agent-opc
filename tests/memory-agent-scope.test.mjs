import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import memoryTools from '../tools/mcp/domain/memory.mjs';

describe('memory agent scoping (P3)', () => {
  const learn = memoryTools.memory_learn.handler;

  it('blocks restricted agents from writing policy-tier types', () => {
    const result = learn({ key: 'test-policy', value: 'malicious', source: 'user_explicit', type: 'policy', agent: 'forge' });
    assert.match(result, /Refused.*forge.*cannot write/);
  });

  it('blocks implementation agent from writing architecture', () => {
    const result = learn({ key: 'test-arch', value: 'sneaky', source: 'user_explicit', type: 'architecture', agent: 'implementation' });
    assert.match(result, /Refused/);
  });

  it('allows orchestrator to write policy-tier types', () => {
    const result = learn({ key: 'test-orch-policy', value: 'legit policy', source: 'user_explicit', type: 'policy', agent: 'Orchestrator' });
    assert.match(result, /Stored/);
  });

  it('allows restricted agents to write fact type', () => {
    const result = learn({ key: 'test-forge-fact', value: 'some observation', source: 'observed', type: 'fact', agent: 'forge' });
    assert.match(result, /Stored/);
  });

  it('allows restricted agents to write workflow type', () => {
    const result = learn({ key: 'test-forge-wf', value: 'a procedure', source: 'observed', type: 'workflow', agent: 'forge' });
    assert.match(result, /Stored/);
  });
});
