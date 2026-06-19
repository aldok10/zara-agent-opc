# Antipatterns Quick Reference

| Antipattern | Problem | Solution |
|-------------|---------|----------|
| Big Ball of Mud | No modular structure, disorganized code | Apply Clean Architecture, SOLID, boundary enforcement |
| Spaghetti Code | Unstructured, tangled control flow | Refactor with SRP, Extract Method, clear abstractions |
| Golden Hammer | Using familiar solution for every problem | Broaden pattern vocabulary, assess fit before applying |
| Feature Creep | Adding features without clear value | YAGNI, Pain-Driven Development, clear scope definition |
| Analysis Paralysis | Over-planning without shipping | Timeboxing, Shipping is a Feature, incremental delivery |
| Death March | Impossible deadlines known upfront | Honest estimation, push back, incremental delivery |
| Copy-Paste Programming | Duplicating code instead of abstracting | DRY, Extract Method, shared libraries |
| Magic Strings | String literals scattered in code | Constants, enums, configuration |
| Service Locator | Hidden dependencies via global registry | Explicit Dependency Injection |
| Not Invented Here | Rejecting external solutions | Pragmatic evaluation, build vs. buy analysis |
| Mushroom Management | Keeping devs in dark, misinformed | Transparency, Whole Team Activity, collective ownership |
| Premature Optimization | Optimizing before measuring | Measure first, profile-guided optimization |
| Smoke and Mirrors | Demo-ware that isn't real | Honest status reporting, incremental delivery |
| Static Cling | Static methods creating tight coupling | Dependency Injection, Interface-based design |
| Witches' Brew Architecture | Architecture cobbled from different sources | Clear architectural vision, documented decisions |
| Duct Tape Coder | Prioritizing speed over all quality | Balance shipping with maintainability |
| Big Design Up Front | Complete design before coding | Agile, iterative design, YAGNI |
