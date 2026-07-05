---
type: subskill
title: "Schema Evolution"
---

# Schema Evolution

## Core Concepts

- Schemas change over time: new columns, renamed fields, type changes, removed attributes
- Backward compatibility: new readers can read old data
- Forward compatibility: old readers can read new data
- Breaking changes require migration strategies: dual-write, backfill, versioned schemas
- Schema registries enforce compatibility rules and prevent accidental breaking changes

## Key Practices

- Add new columns as nullable with defaults  -  this is always backward-compatible
- Never remove or rename columns without a deprecation period and migration plan
- Use schema registries (Avro, Protobuf) for streaming data to enforce evolution rules
- Version your schemas explicitly: `v1`, `v2`  -  makes breaking changes intentional
- Test schema changes against both historical data and downstream consumers before deploying

## Common Mistakes

- Changing column types in place (string -> integer) without migrating existing data
- Assuming all consumers will update simultaneously  -  they won't
- Adding NOT NULL columns without defaults to existing tables with data

## When to Apply

- Adding new fields to an existing dataset or event stream
- Upstream source changes its API response format
- Migrating between schema versions in a data lake
- Consumers report parsing errors after a deployment
