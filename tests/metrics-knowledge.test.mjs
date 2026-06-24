import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import metricsTools from '../tools/mcp/domain/metrics.mjs';
import knowledgeTools from '../tools/mcp/domain/knowledge.mjs';

describe('metrics domain', () => {
  it('exposes metrics tools', () => {
    assert.ok(metricsTools.dashboard);
  });

  it('dashboard (all) returns a string', () => {
    const out = metricsTools.dashboard.handler({ section: 'all' });
    assert.equal(typeof out, 'string');
    assert.ok(out.length > 0);
  });
});

describe('knowledge domain', () => {
  it('exposes knowledge tools', () => {
    assert.ok(knowledgeTools.knowledge_index);
    assert.ok(knowledgeTools.knowledge_passage);
    assert.ok(knowledgeTools.knowledge_load_init);
    assert.ok(knowledgeTools.team_knowledge);
  });

  it('knowledge_index list_sections returns a string', () => {
    const out = knowledgeTools.knowledge_index.handler({ list_sections: true });
    assert.equal(typeof out, 'string');
    assert.ok(out.length > 0);
  });

  it('knowledge_passage returns a string without throwing', async () => {
    const out = await knowledgeTools.knowledge_passage.handler({ query: 'zzz_nonexistent_topic_xyz_qqq' });
    assert.equal(typeof out, 'string');
    assert.ok(out.length > 0);
  });

  it('team_knowledge returns a string', () => {
    const out = knowledgeTools.team_knowledge.handler({ query: 'test' });
    assert.equal(typeof out, 'string');
  });
});
