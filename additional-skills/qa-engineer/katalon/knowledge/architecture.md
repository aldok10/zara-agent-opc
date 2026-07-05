---
title: Katalon Platform Architecture
type: architecture
---

# Katalon Platform Architecture

## Ecosystem Components

| Component | Role | Deployment |
|-----------|------|-----------|
| Katalon Studio | Desktop IDE for test authoring, recording, debugging | Local (Windows/macOS) |
| Katalon Runtime Engine (KRE) | CLI execution engine for CI/CD | Local, Docker, or cloud |
| Katalon TestOps / True Platform | Cloud test management, scheduling, analytics | SaaS or Private SaaS |
| Katalon TestCloud | Cloud browser/device infrastructure | SaaS (3000+ environments) |
| StudioAssist / AI Assistant | GenAI: code gen, explain, failure analysis | Built into Studio |
| TrueTest (Production Insights) | Monitors real user sessions, generates tests | SaaS add-on |
| MCP Server | Connects external AI (Claude, Copilot, ChatGPT) | SaaS integration |

## Architecture Flow

```
Authoring (Studio) -> Execution (KRE/TestCloud) -> Management (TestOps) -> Insights (AI/TrueTest)
```

1. **Author** in Studio: record, script in Groovy, or use AI to generate
2. **Execute** via KRE (CLI/Docker) or TestCloud (cloud infrastructure)
3. **Manage** in TestOps: schedule, orchestrate, track results
4. **Analyze** with AI: failure grouping, flaky detection, release readiness

## Supported Platforms

| Platform | Driver | Keywords Package |
|----------|--------|-----------------|
| Web | Selenium WebDriver | WebUI (90+ keywords) |
| Mobile Android | Appium + UiAutomator2 | Mobile |
| Mobile iOS | Appium + XCUITest | Mobile |
| API (REST/SOAP/GraphQL) | Built-in HTTP client | WS |
| Windows Desktop | WinAppDriver | Windows |

## Technology Foundation

- **Language**: Groovy (JVM-based, Java-compatible)
- **IDE**: Eclipse-based (custom Katalon workbench)
- **Web automation**: Selenium WebDriver (bundled, managed)
- **Mobile automation**: Appium (bundled)
- **Build system**: Gradle (optional, for external deps)
- **Version control**: Git integration (EGit-based)

## Licensing Tiers (approximate, verify at katalon.com/pricing)

| Tier | Price | Includes |
|------|-------|----------|
| True Platform | ~$700/seat/year | Test management, reporting, AI insights, cloud execution |
| True Automation | ~$2000/seat/year | Everything above + Studio Enterprise + KRE |
| Enterprise | Custom | All + Private SaaS, hybrid licenses, dedicated support |

## Integration Points

| Category | Tools |
|----------|-------|
| CI/CD | Jenkins, GitHub Actions, GitLab CI, Azure DevOps, AWS CodeBuild |
| ALM | Jira, Azure Boards |
| Container | Docker (katalonstudio/katalon image) |
| Reporting | JUnit XML, HTML, PDF, TestOps dashboards |
| AI | OpenAI, Azure OpenAI, Google Gemini, AWS Bedrock |
| SCM | GitHub, GitLab, Bitbucket, Azure Repos |

## Project File Anatomy

```
project.prj           # XML config (proxy, plugins, project version)
settings/internal/    # Machine-specific (don't commit)
settings/external/    # Shared project settings (commit)
build.gradle          # Optional: external Gradle dependencies
console.properties    # KRE configuration
```

## Self-Healing Architecture

Two-tier system:
1. **Classic**: tries alternative locators in priority order (XPath > Attributes > CSS > Image > Smart Locator)
2. **AI**: if all classic fail, LLM analyzes page source + accessibility tree + screenshot to find element

Self-Healing Insights tab shows healed elements. Approve to persist new locator.

## Execution Modes

| Mode | When |
|------|------|
| Studio UI | Development, debugging, exploratory |
| KRE CLI | CI/CD pipelines, scheduled runs |
| Docker | Containerized CI, clean-room execution |
| TestCloud | Cross-browser/device without infrastructure |
| TestOps Scheduler | Recurring executions on schedule |
