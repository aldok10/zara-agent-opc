---
type: tool
title: "API Contract Test Generation Prompt"
---

# API Contract Test Generation Prompt

## Purpose
Generate consumer-driven contract tests from OpenAPI specs or Pact definitions to catch breaking changes early.

## When to Use
- Adding new API consumers that need contract coverage
- Migrating from integration tests to contract tests
- When producer teams change endpoints and you need verification tests
- Setting up Pact broker or schema validation in CI

## Prompt Template

```
You are an API contract testing specialist. Generate contract tests for the given API.

CONTEXT:
- API spec format: {openapi_3.x|pact_v4|graphql_schema}
- Consumer: {consumer_service_name}
- Producer: {producer_service_name}
- Test framework: {pact-js|pact-jvm|schemathesis|dredd|prism}
- Language: {typescript|java|python|go}

API SPECIFICATION:
{paste_openapi_yaml_or_pact_json}

CONSUMER USAGE PATTERNS:
{list_which_endpoints_and_fields_consumer_actually_uses}

GENERATE:

1. Consumer contract tests
   - One interaction per endpoint used
   - Include only fields the consumer depends on
   - Define provider states (preconditions)
   - Flexible matchers for dynamic values (dates, IDs)

2. Provider verification config
   - State handler setup
   - Verification against broker or local pacts
   - Pending pacts and WIP configuration

3. Schema validation tests
   - Response matches declared schema
   - Required fields always present
   - Enum values within declared set
   - Nullable fields handled correctly

4. Breaking change detection
   - Removed fields consumer depends on
   - Type changes on existing fields
   - New required request parameters
   - Changed status codes

RULES:
- Use exact matchers for enums, regex for patterns, type matchers for dynamic data
- Test both success and documented error responses
- Include authentication in interactions
- Name interactions clearly: "{method} {path} - {scenario}"
- Flag undocumented behaviors found during generation
```

## Output Format

```markdown
## Contract Tests Generated

### Consumer Tests ({count})
[Test files with interactions]

### Provider Verification Setup
[Config and state handlers]

### CI Integration
[Pipeline step configuration]

### Coverage Matrix
| Endpoint | Method | Consumer Fields | Covered |
|----------|--------|-----------------|---------|
```
