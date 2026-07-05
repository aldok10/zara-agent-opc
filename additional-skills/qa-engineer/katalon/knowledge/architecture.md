---
type: architecture
title: "Katalon Platform Architecture"
---

# Katalon Platform Architecture

Katalon is an end-to-end test automation platform spanning authoring, execution, management, and AI-driven insights. Components connect through the cloud-backed True Platform.

## Ecosystem Components

| Component | Role | Form Factor |
| --- | --- | --- |
| Katalon Studio | Authoring IDE: record, script, debug | Desktop app (Eclipse-based) |
| Katalon Runtime Engine (KRE) | Headless CLI execution for CI/CD | Command-line, Docker image |
| TestOps / True Platform | Test management, reporting, scheduling, analytics | Cloud (SaaS) |
| TestCloud | On-demand browser and device infrastructure | Cloud (3000+ environments) |
| StudioAssist / AI Assistant | GenAI code generation, failure analysis, self-healing | Embedded in Studio |
| TrueTest (Production Insights) | Monitors real user sessions, generates missing tests | Cloud service |
| MCP Server | Bridges external AI tools (Claude, Copilot) to Katalon | Local/protocol server |

## Architecture Layers

The platform flows across four layers, each feeding the next:

1. **Authoring** -- Katalon Studio builds test cases, objects, and keywords.
2. **Execution** -- KRE runs tests headlessly; TestCloud supplies remote browsers and devices.
3. **Management** -- TestOps aggregates results, schedules runs, and reports analytics.
4. **Insights** -- StudioAssist and TrueTest close the loop with AI analysis and auto-generated coverage.

```
Studio (author) --> KRE / TestCloud (execute) --> TestOps (manage) --> AI + TrueTest (insights)
                                                       ^______________________|
                                                        feedback loop
```

## Supported Test Types and Underlying Drivers

| Domain | Driver / Protocol | Notes |
| --- | --- | --- |
| Web | Selenium WebDriver | Chrome, Firefox, Edge, Safari, headless |
| Mobile | Appium | Android (UIAutomator2), iOS (XCUITest) |
| API | REST, SOAP, GraphQL | Request objects with data-driven inputs |
| Desktop | WinAppDriver | Windows native application automation |

## Component Interaction Details

- **Studio to KRE**: Studio exports the project; KRE runs the same project via `katalonc` CLI, so authored tests execute unchanged in CI/CD.
- **KRE to TestCloud**: KRE requests remote browser/device sessions instead of local drivers, reducing local infra needs.
- **KRE to TestOps**: Execution reports upload to TestOps for centralized dashboards and history.
- **Studio to MCP Server**: External AI clients issue commands through the MCP Server to inspect or generate Katalon artifacts.

## Licensing Tiers

| Tier | Approx. Price | Positioning |
| --- | --- | --- |
| True Platform | ~$700 / seat | Core authoring plus platform access |
| True Automation | ~$2000 / seat | Full automation with advanced execution |
| Enterprise | Custom | Scaled seats, SSO, support, procurement terms |

Pricing changes over time; confirm current figures with Katalon sales before quoting.

## Technology Stack

- **Language**: Groovy scripting on top of Java (test scripts compile to JVM bytecode).
- **IDE base**: Eclipse RCP framework for Studio.
- **Web engine**: Selenium WebDriver.
- **Mobile engine**: Appium.
- **Packaging**: Docker images for KRE enable reproducible CI runs.

## Integration Points

| Category | Integrations |
| --- | --- |
| Issue tracking | Jira, Azure DevOps |
| CI/CD | Jenkins, GitHub Actions, GitLab CI |
| Containers | Docker (KRE image) |
| Reporting | TestOps dashboards, webhooks |

## Key Architectural Notes

- KRE is the CI/CD execution unit; Studio is not required on build agents.
- TestCloud removes the need to maintain a local Selenium Grid or device lab.
- Self-healing and AI features depend on TestOps/True Platform connectivity.
- The MCP Server is the integration surface for AI-assisted workflows outside the Studio UI.
