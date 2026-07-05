# Katalon Project Structure

Organize projects for reuse, environment portability, and clean version control.

## Standard Folder Structure

A `.prj` project contains these top-level folders:

- **Test Cases** - test logic (`.tc` + Groovy script)
- **Object Repository** - stored UI elements (Test Objects)
- **Test Suites** - grouped test cases + data binding (`.ts`, `.tsc` for collections)
- **Keywords** - custom Groovy keywords
- **Profiles** - execution profiles (environment configs)
- **Data Files** - Internal Data, Excel, CSV, DB references
- **Test Listeners** - hooks: `@BeforeTestCase`, `@AfterTestSuite`, etc.
- **Include** - features, step definitions, external scripts (`Include/scripts/groovy`)

## Page Object Model in Object Repository

Mirror the app's page structure with folders:

```
Object Repository/
  LoginPage/
    txt_Username
    txt_Password
    btn_Submit
  DashboardPage/
    lnk_Profile
    btn_Logout
```

One folder per page. Elements live under the page they belong to. This keeps locators discoverable and refactorable when a page changes.

## Naming Conventions

- **Local variables**: `camelCase` (`userEmail`, `orderTotal`)
- **Global variables**: `UPPERCASE` (`BASE_URL`, `API_TIMEOUT`)
- **Test Objects**: `PageName/elementType_Name` (`LoginPage/btn_Submit`)
- **Custom keywords**: `PascalCase` class, `camelCase` method
- **Test cases**: descriptive verb-first (`Verify Login With Valid Credentials`)

## Execution Profiles

Profiles hold environment-specific values. The `default` profile is the base; other profiles inherit and override.

```
Profiles/
  default      # shared defaults
  staging      # overrides BASE_URL, credentials
  production
```

Switch at runtime with `-executionProfile="staging"`. Override individual values in CLI:

- `-g_BASE_URL="https://stg.app.com"` (visible global)
- `-p_API_KEY="secret"` (protected/hidden global)

## Global Variables

- Defined per profile, referenced as `GlobalVariable.NAME`.
- Mark credentials and tokens as **Protected** so values are masked in logs and reports.
- Scope is per Test Suite in a Test Suite Collection (TSC) - each suite gets its own copy, no cross-suite bleed.

## Recommended .gitignore

Commit source, ignore generated artifacts.

```gitignore
# ignore
Reports/
bin/
.settings/
Libs/
*.log
# commit: Test Cases/, Object Repository/, Profiles/,
# Keywords/, Test Suites/, Data Files/, Include/
```

## Modular Test Case Design

Extract shared flows (login, setup, teardown) into their own test cases and reuse via `callTestCase`:

```groovy
callTestCase(findTestCase('Common/Login'),
    [username: 'admin', password: GlobalVariable.ADMIN_PW])
```

Keep each test case focused on one scenario. Compose larger flows from small reusable cases rather than duplicating steps.
