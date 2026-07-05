# Project Structure

## Standard Folder Layout

```
<ProjectName>/
  Test Cases/           # Groovy scripts (.tc), organized by module
  Object Repository/    # Test objects (locators), Page Object Model
  Test Suites/          # Groups of test cases for execution
  Test Suite Collections/  # Parallel/sequential suite groups
  Test Listeners/       # Hooks: @BeforeTestCase, @AfterTestSuite, etc.
  Keywords/             # Custom keyword classes (Groovy packages)
  Profiles/             # Execution profiles with global variables
  Data Files/           # CSV, Excel, DB connections, Internal Data
  Checkpoints/          # Data snapshots for regression comparison
  Include/              # BDD features, step definitions, config
    features/           # .feature files (Gherkin)
    scripts/groovy/     # Step definition classes
  Drivers/              # External JAR libraries
  Libs/                 # Auto-generated library references
  Reports/              # Generated after execution (don't commit)
  <ProjectName>.prj     # Project configuration file
```

## Page Object Model in Object Repository

Mirror your application's page structure:

```
Object Repository/
  Login_Page/
    input_Username
    input_Password
    btn_Login
  Dashboard/
    nav_MainMenu
    lbl_WelcomeMessage
  Common/
    btn_Close
    modal_Confirmation
```

Test Cases should mirror this structure:

```
Test Cases/
  Authentication/
    TC_Login_Valid
    TC_Login_Invalid
  Dashboard/
    TC_Dashboard_Loads
  Common/
    Setup_Login        # Reusable via callTestCase
    Teardown_Logout
```

## Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Local variables | camelCase | `userName`, `loginResult` |
| Global Variables | UPPERCASE | `BASE_URL`, `TIMEOUT`, `API_KEY` |
| Test Objects | PageName/elementTypeName | `Login_Page/btn_Submit` |
| Custom Keywords | PascalCase class, camelCase method | `WebActions.safeClick()` |
| Test Cases | TC_Feature_Scenario | `TC_Login_ValidCredentials` |

## Execution Profiles

Create per environment: `default`, `staging`, `production`, `local`.

- `default` holds shared variables (inherited by all others)
- Override specific values in environment-specific profiles
- Mark passwords/tokens as **Protected** (masked in logs, not committed)
- CLI override: `-g_BASE_URL=https://staging.app.com` (visible) or `-p_PASSWORD=secret` (hidden)
- Scope: Global Variables are per-Test-Suite within a TSC

## .gitignore

```gitignore
# Commit these: Test Cases/, Object Repository/, Keywords/, Profiles/,
#   Test Suites/, Test Listeners/, Data Files/, Include/, Drivers/, .prj

# Ignore:
bin/
build/
Reports/
.project
.classpath
.settings/
*.log
*.tmp
Screenshots/
Videos/
.gradle/
```

## Modular Design

Use `WebUI.callTestCase()` for reusable flows:

```groovy
// Main test calls shared login
WebUI.callTestCase(findTestCase('Common/Setup_Login'), [
    'username': GlobalVariable.USERNAME,
    'password': GlobalVariable.PASSWORD
])
// ... test-specific steps ...
WebUI.callTestCase(findTestCase('Common/Teardown_Logout'), [:])
```
