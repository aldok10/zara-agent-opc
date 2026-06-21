import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import metricsTools from '../tools/mcp/domain/metrics.mjs';
import knowledgeTools from '../tools/mcp/domain/knowledge.mjs';

describe('metrics domain', () => {
  it('exposes metrics tools', () => {
    assert.ok(metricsTools.metrics_today);
    assert.ok(metricsTools.micro_tools);
    assert.ok(metricsTools.workflow_rules);
    assert.ok(metricsTools.dashboard);
  });

  it('metrics_today returns a string without throwing', () => {
    const out = metricsTools.metrics_today.handler();
    assert.equal(typeof out, 'string');
    assert.ok(out.length > 0);
  });

  it('micro_tools returns a string', () => {
    assert.equal(typeof metricsTools.micro_tools.handler(), 'string');
  });

  it('workflow_rules returns a string', () => {
    assert.equal(typeof metricsTools.workflow_rules.handler(), 'string');
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

  it('knowledge_passage is graceful when no query match', () => {
    const out = knowledgeTools.knowledge_passage.handler({ query: 'zzz_nonexistent_topic_xyz_qqq' });
    assert.equal(typeof out, 'string');
    // Either "no passages" or "not indexed" — never a crash
    assert.ok(/passage|index/i.test(out));
  });

  it('team_knowledge returns a string', () => {
    const out = knowledgeTools.team_knowledge.handler({ query: 'test' });
    assert.equal(typeof out, 'string');
  });
});
