# Data-Driven Testing

## Data Sources

| Type | Use Case |
|------|----------|
| Internal Data | Small datasets, quick prototyping (define rows/columns in Studio) |
| Excel (.xlsx) | Large datasets maintained by non-technical team members |
| CSV | Simple datasets, easy to generate/version control |
| Database (JDBC) | Live/dynamic data, large volumes, shared across projects |

## findTestData API

```groovy
import static com.kms.katalon.core.testdata.TestDataFactory.findTestData

def data = findTestData('Data Files/LoginCredentials')
int rows = data.getRowNumbers()

for (int i = 1; i <= rows; i++) {
    String user = data.getValue('username', i)
    String pass = data.getValue('password', i)
    // ... use in test steps
}
```

## Test Suite Data Binding

1. Open Test Suite > click **Show Data Binding**
2. Select test case > choose **Use Variables and Binding at Suite Test Case**
3. In **Test Data** table: click Add, select your data file
4. In **Variable Binding** table: map variables to column names
5. Use **Map All** if variable names match column headers exactly

## Iteration Control

| Option | Effect |
|--------|--------|
| Run all rows | Execute with every data row |
| Run from row X to Y | Specific range |
| Run with specific rows | Notation: `1,3,5` or `1-5,9,12` |

## Multi-Source Relationships

| Type | Behavior |
|------|----------|
| One-to-One | Rows paired sequentially (row 1 + row 1, row 2 + row 2) |
| Many-to-Many | Cartesian product (every combination) |
| One-to-Many | Each "One" row paired with all "Many" rows |

## Variable Scopes

| Scope | Definition | Override |
|-------|-----------|---------|
| Test Case Variables | Defined in TC Variables tab | Via callTestCase or data binding |
| Global Variables | Defined in Execution Profile | Different profile or CLI `-g_`/`-p_` |
| Profile Variables | Same as Global (profile-specific) | Select different profile at runtime |

Key: Global Variables are scoped per Test Suite within a TSC. Modifying one in Suite A doesn't affect Suite B.

## Parameterized Test Objects

In Object Repository, define locator with variables:
```
XPath: //div[@data-id='${itemId}']/button[@class='${action}']
```

Use in script:
```groovy
WebUI.click(findTestObject('Catalog/btn_action', ['itemId': '123', 'action': 'buy']))
```

## Database Connection

Project Settings > Database:
- JDBC Driver: `com.mysql.cj.jdbc.Driver` (or PostgreSQL/Oracle/SQL Server built-in)
- URL: `jdbc:mysql://hostname:3306/db_name`
- User/Password: credentials
- Test Connection to verify

Create Database data file with SQL query:
```sql
SELECT username, password, role FROM test_users WHERE active = 1
```

## BDD/Cucumber Integration

Feature file (`Include/features/login.feature`):
```gherkin
Scenario Outline: Login with credentials
  Given I open the login page
  When I enter <username> and <password>
  Then I should see <result>

  Examples:
    | username | password | result  |
    | admin    | pass123  | Welcome |
    | invalid  | wrong    | Error   |
```

Step definitions in `Include/scripts/groovy/`:
```groovy
@When("I enter (.*) and (.*)")
def enterCredentials(String user, String pass) {
    WebUI.setText(findTestObject('Login/input_user'), user)
    WebUI.setText(findTestObject('Login/input_pass'), pass)
    WebUI.click(findTestObject('Login/btn_submit'))
}
```

## Checkpoints

Checkpoints snapshot data for regression comparison:
```groovy
import static com.kms.katalon.core.checkpoint.CheckpointFactory.findCheckpoint
boolean match = WebUI.verifyCheckpoint(findCheckpoint('Checkpoints/UserData'), false)
```

Use for: database regression, data migration validation, report verification.

## CLI Variable Override

```bash
# Visible in logs
-g_BASE_URL="https://staging.example.com"

# Hidden in logs (protected)
-p_API_SECRET="my-secret-key"
```
