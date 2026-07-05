# References

## Mutation Testing Theory (8 refs)
- **Mutation Testing Overview** -- https://pitest.org/quickstart/mutators/ -- Types of mutations and how they work
- **An Introduction to Mutation Testing** -- https://www.baeldung.com/java-mutation-testing-with-pitest -- Concepts, operators, and survival analysis
- **Mutation Score** -- https://stryker-mutator.io/docs/mutation-testing-elements/mutant-states-and-metrics/ -- Understanding killed, survived, and equivalent mutants
- **Equivalent Mutants Problem** -- https://cs.gmu.edu/~offutt/rsrch/papers/equivalentmutants.pdf -- The challenge of false-positive survivors
- **Selective Mutation** -- https://ieeexplore.ieee.org/document/328068 -- Reducing mutation operators for efficiency
- **Mutation Operators** -- https://stryker-mutator.io/docs/mutation-testing-elements/supported-mutators/ -- Standard mutation operators across languages
- **Higher-Order Mutation** -- https://link.springer.com/article/10.1007/s11219-017-9382-0 -- Combining multiple mutations for deeper testing
- **Weak vs Strong Mutation** -- https://www.researchgate.net/publication/220422839_Weak_mutation_testing -- Trade-offs in mutation analysis strength

## Stryker (JavaScript/TypeScript) (8 refs)
- **Stryker Documentation** -- https://stryker-mutator.io/docs/ -- Official Stryker mutation testing framework docs
- **Stryker Getting Started** -- https://stryker-mutator.io/docs/stryker-js/getting-started/ -- Setup and first mutation run
- **Stryker Configuration** -- https://stryker-mutator.io/docs/stryker-js/configuration/ -- stryker.config.mjs options
- **Stryker Reporters** -- https://stryker-mutator.io/docs/stryker-js/reporters/ -- HTML, dashboard, and clear-text reporters
- **Stryker Incremental** -- https://stryker-mutator.io/docs/stryker-js/incremental/ -- Running mutation testing only on changed code
- **Stryker Dashboard** -- https://dashboard.stryker-mutator.io/ -- Public mutation score badges and reporting
- **Stryker Plugins** -- https://stryker-mutator.io/docs/stryker-js/plugins/ -- Test runner and checker plugins
- **Stryker .NET** -- https://stryker-mutator.io/docs/stryker-net/introduction/ -- Mutation testing for C# projects

## PIT (Java/JVM) (7 refs)
- **PIT Documentation** -- https://pitest.org/ -- Official PIT mutation testing system
- **PIT Quickstart** -- https://pitest.org/quickstart/ -- Maven and Gradle setup
- **PIT Mutators** -- https://pitest.org/quickstart/mutators/ -- Available mutation operators
- **PIT Maven Plugin** -- https://pitest.org/quickstart/maven/ -- Maven integration configuration
- **PIT Gradle Plugin** -- https://gradle-pitest-plugin.solidsoft.info/ -- Gradle integration for PIT
- **PIT IntelliJ Plugin** -- https://plugins.jetbrains.com/plugin/7119-pit-mutation-testing -- IDE integration
- **PIT Filters** -- https://pitest.org/quickstart/basic_concepts/ -- Excluding code from mutation analysis

## CI Integration (7 refs)
- **Stryker in GitHub Actions** -- https://stryker-mutator.io/docs/stryker-js/guides/github-actions/ -- CI pipeline setup
- **PIT in Jenkins** -- https://pitest.org/quickstart/jenkins/ -- Jenkins plugin for mutation reporting
- **Mutation Testing in PRs** -- https://stryker-mutator.io/docs/stryker-js/incremental/ -- Running only on PR diffs
- **Quality Gates with Mutation Score** -- https://stryker-mutator.io/docs/stryker-js/configuration/#thresholds -- Failing builds on low mutation score
- **Infection PHP** -- https://infection.github.io/guide/ -- Mutation testing framework for PHP
- **mutmut** -- https://mutmut.readthedocs.io/ -- Python mutation testing tool
- **cargo-mutants** -- https://github.com/sourcefrog/cargo-mutants -- Mutation testing for Rust

## Best Practices (5 refs)
- **When to Use Mutation Testing** -- https://testing.googleblog.com/2021/04/mutation-testing.html -- Google's perspective on practical mutation testing
- **Mutation Testing vs Code Coverage** -- https://www.codeproject.com/Articles/5290669/Mutation-Testing-Is-Better-Than-Code-Coverage -- Why mutation score is more meaningful
- **Targeting Mutation Tests** -- https://blog.scottlogic.com/2022/01/mutation-testing.html -- Focusing mutation testing on critical code
- **Performance Optimization** -- https://stryker-mutator.io/docs/stryker-js/disable-mutants/ -- Disabling mutants for performance
- **Mutation Testing Patterns** -- https://www.thoughtworks.com/radar/techniques/mutation-testing -- ThoughtWorks Radar entry on adoption patterns
