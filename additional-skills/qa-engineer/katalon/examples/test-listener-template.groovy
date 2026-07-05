import com.kms.katalon.core.annotation.BeforeTestCase
import com.kms.katalon.core.annotation.AfterTestCase
import com.kms.katalon.core.annotation.BeforeTestSuite
import com.kms.katalon.core.annotation.AfterTestSuite
import com.kms.katalon.core.context.TestCaseContext
import com.kms.katalon.core.context.TestSuiteContext
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI
import com.kms.katalon.core.configuration.RunConfiguration
import internal.GlobalVariable

class ProjectTestListener {

    @BeforeTestSuite
    def setupSuite(TestSuiteContext suiteContext) {
        String env = GlobalVariable.ENVIRONMENT ?: 'dev'
        switch (env) {
            case 'production':
                GlobalVariable.BASE_URL = 'https://app.production.com'
                GlobalVariable.SKIP_DATA_SETUP = true
                break
            case 'staging':
                GlobalVariable.BASE_URL = 'https://staging.app.com'
                GlobalVariable.SKIP_DATA_SETUP = false
                break
            default:
                GlobalVariable.BASE_URL = 'http://localhost:3000'
                GlobalVariable.SKIP_DATA_SETUP = false
        }
        println "[Setup] Suite: ${suiteContext.getTestSuiteId()} | Env: ${env}"
    }

    @BeforeTestCase
    def setupTestCase(TestCaseContext testCaseContext) {
        String testId = testCaseContext.getTestCaseId()
        // API tests skip browser setup
        if (testId.contains('/API/')) {
            println "[Setup] API test - skipping browser"
            return
        }
        // WebUI tests get a clean browser state
        println "[Setup] WebUI test: ${testId}"
    }

    @AfterTestCase
    def teardownTestCase(TestCaseContext testCaseContext) {
        String status = testCaseContext.getTestCaseStatus()
        if (status == 'FAILED') {
            try {
                String screenshotPath = RunConfiguration.getReportFolder() + '/screenshots/'
                String filename = testCaseContext.getTestCaseId().replaceAll('/', '_') + '.png'
                WebUI.takeScreenshot(screenshotPath + filename)
                println "[Teardown] Screenshot saved: ${filename}"
            } catch (Exception e) {
                println "[Teardown] Screenshot failed: ${e.message}"
            }
        }
        println "[Teardown] ${testCaseContext.getTestCaseId()} - ${status}"
    }

    @AfterTestSuite
    def teardownSuite(TestSuiteContext suiteContext) {
        println "[Cleanup] Suite complete: ${suiteContext.getTestSuiteId()}"
        // Add: report upload, Slack notification, data cleanup, etc.
    }
}
