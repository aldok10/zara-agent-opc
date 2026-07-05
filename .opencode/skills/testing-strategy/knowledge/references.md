---
type: fact
title: "Testing Strategy References"
---
# Testing Strategy References

Subskills: ai-era-testing, chaos-engineering, code-review, contract-testing, mutation-testing, performance-testing, property-based, tdd, verification.

---

## TDD & Testing Philosophy

1. Beck, K. (2002). *Test-Driven Development: By Example*. Addison-Wesley.
2. Freeman, S. & Pryce, N. (2009). *Growing Object-Oriented Software, Guided by Tests*. Addison-Wesley.
3. Cohn, M. (2009). *The Testing Pyramid*. https://martinfowler.com/bliki/TestPyramid.html
4. Dodds, K.C. *The Testing Trophy*. https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications
5. Testing Diamond -- Spotify's approach to test distribution. https://engineering.atspotify.com/2018/01/testing-of-microservices/
6. North, D. (2006). *Introducing BDD*. https://dannorth.net/introducing-bdd/
7. Cucumber -- BDD automation framework. https://cucumber.io/docs
8. Gherkin syntax reference. https://cucumber.io/docs/gherkin/reference/
9. Fowler, M. *Mocks Aren't Stubs*. https://martinfowler.com/articles/mocksArentStubs.html
10. Fowler, M. *Test Double* patterns. https://martinfowler.com/bliki/TestDouble.html
11. Feathers, M. (2004). *Working Effectively with Legacy Code*. Prentice Hall.
12. Marick, B. *Testing Without a GUI*. https://www.exampler.com/testing-com/writings.html
13. Shore, J. & Warden, S. (2021). *The Art of Agile Development* (2nd ed.) -- TDD chapters.
14. Arrange-Act-Assert pattern. https://wiki.c2.com/?ArrangeActAssert
15. Given-When-Then pattern for test structure. https://martinfowler.com/bliki/GivenWhenThen.html

## Test Automation Frameworks

16. Playwright documentation -- end-to-end testing. https://playwright.dev/docs/intro
17. Playwright test runner and fixtures. https://playwright.dev/docs/test-fixtures
18. Vitest documentation. https://vitest.dev/guide/
19. Vitest -- workspace mode for monorepos. https://vitest.dev/guide/workspace
20. Jest documentation. https://jestjs.io/docs/getting-started
21. Cypress documentation. https://docs.cypress.io/
22. Cypress component testing. https://docs.cypress.io/guides/component-testing/overview
23. Testing Library -- user-centric DOM testing. https://testing-library.com/docs/
24. MSW (Mock Service Worker) -- API mocking. https://mswjs.io/docs/
25. Testcontainers -- real dependencies in tests. https://testcontainers.com/
26. pytest documentation. https://docs.pytest.org/
27. Go testing package and conventions. https://pkg.go.dev/testing
28. k6 documentation -- performance testing. https://grafana.com/docs/k6/latest/
29. Supertest -- HTTP assertions for Node.js. https://github.com/ladjs/supertest
30. Nock -- HTTP server mocking for Node.js. https://github.com/nock/nock

## AI-Era Testing

31. Verifying LLM-generated code -- strategies and patterns. https://martinfowler.com/articles/exploring-gen-ai.html
32. Mutation testing for AI output validation -- Stryker patterns. https://stryker-mutator.io/docs/
33. fast-check -- property-based testing for TypeScript/JavaScript. https://fast-check.dev/
34. Hypothesis -- property-based testing for Python. https://hypothesis.readthedocs.io/
35. LangSmith -- LLM evaluation and tracing. https://docs.smith.langchain.com/
36. RAGAS -- RAG evaluation framework. https://docs.ragas.io/
37. DeepEval -- LLM evaluation framework. https://docs.confident-ai.com/
38. Promptfoo -- LLM prompt testing and evaluation. https://www.promptfoo.dev/docs/intro/
39. Braintrust -- AI product evaluation. https://www.braintrust.dev/docs
40. Testing AI systems -- reference architectures. https://www.anthropic.com/research/evaluating-ai-systems
41. Snapshot testing for deterministic AI outputs. https://vitest.dev/guide/snapshot
42. Differential testing -- comparing implementations. https://en.wikipedia.org/wiki/Differential_testing
43. Metamorphic testing for ML systems. https://ieeexplore.ieee.org/document/9000651
44. A/B testing frameworks for AI features. https://docs.statsig.com/
45. Guardrails AI -- validation framework for LLM outputs. https://www.guardrailsai.com/docs

## Contract & Integration Testing

46. Pact -- contract testing documentation. https://docs.pact.io/
47. Pact specification v4. https://github.com/pact-foundation/pact-specification
48. Consumer-driven contract testing patterns. https://martinfowler.com/articles/consumerDrivenContracts.html
49. Zod schema validation. https://zod.dev/
50. JSON Schema specification. https://json-schema.org/specification
51. OpenAPI/Swagger contract testing. https://swagger.io/docs/specification/about/
52. Testcontainers -- integration testing with real services. https://testcontainers.com/guides/
53. WireMock -- API simulation and contract testing. https://wiremock.org/docs/
54. Schemathesis -- API fuzzing from OpenAPI specs. https://schemathesis.readthedocs.io/
55. gRPC testing strategies. https://grpc.io/docs/guides/testing/

## Performance Testing

56. k6 -- scripting and test types. https://grafana.com/docs/k6/latest/using-k6/
57. k6 -- load test patterns (spike, stress, soak). https://grafana.com/docs/k6/latest/testing-guides/test-types/
58. Gatling -- load testing documentation. https://docs.gatling.io/
59. Locust -- Python load testing. https://docs.locust.io/
60. Chaos Monkey -- Netflix resilience tool. https://netflix.github.io/chaosmonkey/
61. LitmusChaos -- Kubernetes chaos engineering. https://litmuschaos.io/docs/
62. Chaos Toolkit -- declarative chaos experiments. https://chaostoolkit.org/
63. Gremlin -- enterprise chaos engineering. https://www.gremlin.com/docs/
64. SRE approaches to performance -- Google SRE Book. https://sre.google/sre-book/table-of-contents/
65. Lighthouse -- web performance auditing. https://developer.chrome.com/docs/lighthouse/

## Mutation Testing

66. Stryker Mutator documentation (JavaScript/TypeScript). https://stryker-mutator.io/docs/stryker-js/introduction/
67. Stryker supported mutators. https://stryker-mutator.io/docs/mutation-testing-elements/supported-mutators/
68. PIT -- mutation testing for Java. https://pitest.org/
69. mutmut -- mutation testing for Python. https://mutmut.readthedocs.io/
70. Mutation testing theory -- Jia & Harman (2011). *An Analysis and Survey of the Development of Mutation Testing*. IEEE TSE.
71. Equivalent mutants problem. https://pitest.org/quickstart/surviving_mutants/
72. Mutation score as test quality metric. https://stryker-mutator.io/docs/General/mutation-score/
73. Cosmic-ray -- mutation testing for Python. https://cosmic-ray.readthedocs.io/
74. Incremental mutation testing strategies. https://stryker-mutator.io/docs/stryker-js/incremental/
75. Mutation testing in CI pipelines. https://stryker-mutator.io/docs/stryker-js/guides/ci-integration/

## Code Review

76. Google Engineering Practices -- Code Review Developer Guide. https://google.github.io/eng-practices/review/
77. Google -- How to do a code review (reviewer guide). https://google.github.io/eng-practices/review/reviewer/
78. Conventional Comments -- structured review feedback. https://conventionalcomments.org/
79. Stacked diffs workflow (Graphite). https://graphite.dev/guides/stacked-diffs
80. PR size and cycle time research -- DORA metrics. https://dora.dev/research/
81. Danger.js -- automated code review checks. https://danger.systems/js/
82. Reviewpad -- automated code review. https://docs.reviewpad.com/
83. GitHub pull request review features. https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests
84. Ship Small -- why smaller PRs get better reviews. https://testing.googleblog.com/2017/06/code-health-too-many-comments-on-your.html
85. Beyond code review -- design reviews and ADRs. https://adr.github.io/

## Security Testing

86. OWASP Testing Guide v4.2. https://owasp.org/www-project-web-security-testing-guide/
87. OWASP Top 10 (2021). https://owasp.org/www-project-top-ten/
88. Semgrep -- static analysis rules. https://semgrep.dev/docs/
89. Semgrep rule writing. https://semgrep.dev/docs/writing-rules/overview/
90. Trivy -- vulnerability scanner. https://aquasecurity.github.io/trivy/
91. Snyk documentation -- SCA and SAST. https://docs.snyk.io/
92. OWASP ZAP -- DAST tool. https://www.zaproxy.org/docs/
93. CodeQL -- semantic code analysis. https://codeql.github.com/docs/
94. Bandit -- Python security linter. https://bandit.readthedocs.io/
95. gosec -- Go security checker. https://github.com/securego/gosec
96. npm audit and supply chain security. https://docs.npmjs.com/cli/v10/commands/npm-audit
97. Socket.dev -- supply chain threat detection. https://socket.dev/
98. OWASP ASVS -- Application Security Verification Standard. https://owasp.org/www-project-application-security-verification-standard/
99. Nuclei -- vulnerability scanning with templates. https://docs.projectdiscovery.io/tools/nuclei/overview
100. Checkov -- infrastructure-as-code security scanning. https://www.checkov.io/1.Welcome/Quick%20Start.html
101. tfsec/trivy -- Terraform security scanner. https://aquasecurity.github.io/trivy/latest/docs/scanner/misconfiguration/
102. Bearer -- code security and data flow analysis. https://docs.bearer.com/
103. GitGuardian -- secrets detection platform. https://docs.gitguardian.com/
104. Dastardly -- lightweight DAST from PortSwigger. https://portswigger.net/burp/dastardly
105. SARIF format -- Static Analysis Results Interchange Format. https://sarifweb.azurewebsites.net/

---

Total: 105 references.
