import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  parseFrontmatter, extractLinks, parseBundle, isOkfBundle,
  validateBundle, mapType, parseIndex, parseLog, DEFAULT_TYPE_MAP,
} from '../tools/memory/okf.mjs';

const FIXTURE_DIR = path.join(os.tmpdir(), `zara-okf-${Date.now()}`);

describe('OKF parser', () => {
  before(() => {
    fs.mkdirSync(path.join(FIXTURE_DIR, 'tables'), { recursive: true });
    fs.mkdirSync(path.join(FIXTURE_DIR, 'playbooks'), { recursive: true });

    fs.writeFileSync(path.join(FIXTURE_DIR, 'tables/orders.md'), `---
type: BigQuery Table
title: Orders
description: One row per completed customer order.
tags: [sales, orders]
timestamp: 2026-05-28T14:30:00Z
owner: data-team
---

# Schema

| Column | Type | Description |
|--------|------|-------------|
| order_id | STRING | Unique ID |
| customer_id | STRING | FK to [customers](/tables/customers.md) |

See [customers](./customers.md) for join key.
`);

    fs.writeFileSync(path.join(FIXTURE_DIR, 'tables/customers.md'), `---
type: BigQuery Table
title: Customers
description: Customer master data.
tags: [crm, customers]
---

Customer dimension table. Related to [orders](/tables/orders.md).
`);

    fs.writeFileSync(path.join(FIXTURE_DIR, 'playbooks/incident.md'), `---
type: Playbook
title: Incident Response
description: Steps to triage a freshness alert.
tags: [oncall, incident]
---

# Trigger

A freshness alert fires when orders lags more than 30 minutes.
See the [orders table](/tables/orders.md).
`);

    // index.md (reserved, should not be parsed as concept)
    fs.writeFileSync(path.join(FIXTURE_DIR, 'index.md'), `# My Bundle

* [Orders](./tables/orders.md) - One row per order
* [Customers](./tables/customers.md): Customer master
* [Incident](./playbooks/incident.md) - Alert response
`);

    // log.md (reserved)
    fs.writeFileSync(path.join(FIXTURE_DIR, 'log.md'), `# Update Log

## 2026-05-28
* **Creation**: Added orders and customers tables.
* **Update**: Added incident playbook.

## 2026-05-20
* **Initialization**: Created bundle structure.
`);
  });

  after(() => {
    fs.rmSync(FIXTURE_DIR, { recursive: true, force: true });
  });

  describe('parseFrontmatter', () => {
    it('parses standard frontmatter', () => {
      const { meta, body } = parseFrontmatter(`---
type: Metric
title: Revenue
---

# Revenue

Total revenue across channels.
`);
      assert.equal(meta.type, 'Metric');
      assert.equal(meta.title, 'Revenue');
      assert.ok(body.includes('Total revenue'));
    });

    it('handles missing frontmatter', () => {
      const { meta, body } = parseFrontmatter('Just plain markdown\n\nNo frontmatter here.');
      assert.deepEqual(meta, {});
      assert.ok(body.includes('plain markdown'));
    });

    it('handles inline arrays', () => {
      const { meta } = parseFrontmatter(`---
tags: [alpha, beta, gamma]
---
`);
      assert.deepEqual(meta.tags, ['alpha', 'beta', 'gamma']);
    });

    it('coerces numbers and booleans', () => {
      const { meta } = parseFrontmatter(`---
count: 42
active: true
rate: 3.14
---
`);
      assert.equal(meta.count, 42);
      assert.equal(meta.active, true);
      assert.equal(meta.rate, 3.14);
    });
  });

  describe('extractLinks', () => {
    it('extracts absolute and relative links', () => {
      const body = `See [orders](/tables/orders.md) and [customers](./customers.md).
Also check [external](https://example.com) and [anchor](#foo).`;
      const links = extractLinks(body);
      assert.ok(links.includes('tables/orders'));
      assert.ok(links.includes('customers'));
      assert.ok(!links.some(l => l.includes('example.com')));
      assert.ok(!links.some(l => l.includes('foo')));
    });
  });

  describe('parseBundle', () => {
    it('parses all concepts (not reserved files)', () => {
      const concepts = parseBundle(FIXTURE_DIR);
      assert.equal(concepts.length, 3);
      const ids = concepts.map(c => c.conceptId);
      assert.ok(ids.includes('tables/orders'));
      assert.ok(ids.includes('tables/customers'));
      assert.ok(ids.includes('playbooks/incident'));
    });

    it('extracts cross-links from body', () => {
      const concepts = parseBundle(FIXTURE_DIR);
      const orders = concepts.find(c => c.conceptId === 'tables/orders');
      assert.ok(orders.links.includes('tables/customers'));
    });

    it('preserves extension fields in meta', () => {
      const concepts = parseBundle(FIXTURE_DIR);
      const orders = concepts.find(c => c.conceptId === 'tables/orders');
      assert.equal(orders.meta.owner, 'data-team');
    });
  });

  describe('isOkfBundle', () => {
    it('detects OKF bundle', () => {
      assert.ok(isOkfBundle(FIXTURE_DIR));
    });

    it('rejects non-OKF directory', () => {
      const noOkf = path.join(os.tmpdir(), `zara-nookf-${Date.now()}`);
      fs.mkdirSync(noOkf, { recursive: true });
      fs.writeFileSync(path.join(noOkf, 'readme.md'), '---\ntitle: No type\n---\nJust text');
      assert.ok(!isOkfBundle(noOkf));
      fs.rmSync(noOkf, { recursive: true, force: true });
    });
  });

  describe('validateBundle', () => {
    it('validates conformant bundle', () => {
      const concepts = parseBundle(FIXTURE_DIR);
      const result = validateBundle(concepts);
      assert.ok(result.valid);
      assert.equal(result.errors.length, 0);
    });
  });

  describe('mapType', () => {
    it('maps known OKF types to Zara types', () => {
      assert.equal(mapType('Playbook'), 'fact');
      assert.equal(mapType('policy'), 'policy');
      assert.equal(mapType('antipattern'), 'pitfall');
      assert.equal(mapType('architecture'), 'architecture');
      assert.equal(mapType('adr'), 'decision');
    });

    it('falls back to fact for unknown types', () => {
      assert.equal(mapType('BigQuery Table'), 'fact');
      assert.equal(mapType('Custom Widget'), 'fact');
    });
  });

  describe('parseIndex', () => {
    it('parses index.md entries', () => {
      const content = fs.readFileSync(path.join(FIXTURE_DIR, 'index.md'), 'utf8');
      const entries = parseIndex(content);
      assert.equal(entries.length, 3);
      assert.equal(entries[0].title, 'Orders');
      assert.ok(entries[0].description.includes('One row'));
    });
  });

  describe('parseLog', () => {
    it('parses log.md entries', () => {
      const content = fs.readFileSync(path.join(FIXTURE_DIR, 'log.md'), 'utf8');
      const groups = parseLog(content);
      assert.equal(groups.length, 2);
      assert.equal(groups[0].date, '2026-05-28');
      assert.equal(groups[0].entries.length, 2);
      assert.equal(groups[1].date, '2026-05-20');
    });
  });
});
