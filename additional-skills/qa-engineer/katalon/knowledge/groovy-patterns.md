---
title: Groovy Scripting Patterns for Katalon
type: workflow
---

# Groovy Patterns

## String Interpolation (GStrings)

```groovy
def name = "Aldo"
println "Hello ${name}"                    // variable
println "URL: ${GlobalVariable.BASE_URL}"  // global variable
println "Count: ${items.size()}"           // expression
```

Double quotes enable interpolation. Single quotes are plain strings.

## Null Safety

```groovy
// Safe navigation (avoids NPE)
def city = user?.address?.city

// Elvis operator (default value)
def timeout = config?.timeout ?: 30

// Combined
def name = response?.data?.user?.name ?: 'Unknown'
```

## Closures

```groovy
// Basic closure
def greet = { String name -> "Hello ${name}" }
println greet("World")

// With it (implicit parameter)
[1, 2, 3].each { println it }

// As method parameter
def items = ['a', 'b', 'c']
items.eachWithIndex { item, idx -> println "${idx}: ${item}" }
```

## Collection Methods

```groovy
def users = [
    [name: 'Alice', role: 'admin'],
    [name: 'Bob', role: 'user'],
    [name: 'Carol', role: 'admin']
]

// Filter
def admins = users.findAll { it.role == 'admin' }

// Transform
def names = users.collect { it.name }

// Find first
def firstAdmin = users.find { it.role == 'admin' }

// Check conditions
boolean hasAdmin = users.any { it.role == 'admin' }
boolean allActive = users.every { it.active }

// Group
def byRole = users.groupBy { it.role }

// Sort
def sorted = users.sort { it.name }

// Spread operator
def allNames = users*.name  // same as .collect { it.name }
```

## JSON Handling

```groovy
import groovy.json.JsonSlurper
import groovy.json.JsonOutput

// Parse JSON string
def slurper = new JsonSlurper()
def data = slurper.parseText('{"name": "test", "items": [1, 2, 3]}')
println data.name       // "test"
println data.items[0]   // 1

// Generate JSON
def payload = [name: 'New User', email: 'user@test.com', roles: ['admin']]
String json = JsonOutput.toJson(payload)
String pretty = JsonOutput.prettyPrint(json)

// Parse URL response
def result = slurper.parse(new URL("https://api.example.com/health"))
```

## XML Handling

```groovy
import groovy.xml.XmlSlurper

def xml = new XmlSlurper().parseText('''
<response>
  <user id="1">
    <name>Alice</name>
  </user>
</response>
''')

println xml.user.name.text()       // "Alice"
println xml.user.@id              // "1"
```

## Regular Expressions

```groovy
def text = "Order #12345 confirmed on 2024-01-15"

// Match check
if (text ==~ /.*Order #\d+.*/) { println "Has order" }

// Extract groups
def matcher = (text =~ /Order #(\d+)/)
if (matcher.find()) {
    def orderNum = matcher.group(1)  // "12345"
}

// Replace
def cleaned = text.replaceAll(/\d{4}-\d{2}-\d{2}/, 'DATE')
```

## Map and List Literals

```groovy
// Map
def config = [baseUrl: 'https://app.com', timeout: 30, headless: true]
config.each { key, val -> println "${key} = ${val}" }

// List
def browsers = ['Chrome', 'Firefox', 'Edge']
def first = browsers[0]
def last = browsers[-1]

// Range
def numbers = (1..10)
def partial = (1..<5)  // excludes 5
```

## Default Parameters

```groovy
def waitAndClick(TestObject to, int timeout = 30, FailureHandling fh = FailureHandling.STOP_ON_FAILURE) {
    WebUI.waitForElementClickable(to, timeout)
    WebUI.click(to, fh)
}
```

## Katalon-Specific Imports

```groovy
import internal.GlobalVariable
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI
import com.kms.katalon.core.mobile.keyword.MobileBuiltInKeywords as Mobile
import com.kms.katalon.core.webservice.keyword.WSBuiltInKeywords as WS
import com.kms.katalon.core.testobject.TestObject
import com.kms.katalon.core.testobject.ConditionType
import com.kms.katalon.core.model.FailureHandling
import com.kms.katalon.core.util.KeywordUtil
import com.kms.katalon.core.exception.StepFailedException
import com.kms.katalon.core.configuration.RunConfiguration
import static com.kms.katalon.core.testcase.TestCaseFactory.findTestCase
import static com.kms.katalon.core.testdata.TestDataFactory.findTestData
import static com.kms.katalon.core.testobject.ObjectRepository.findTestObject
```

## Limitations in Katalon

- Groovy version fixed at 2.4.x (bundled with Katalon, cannot upgrade)
- No `@Grab`/Grape (add JARs to Drivers/ or use build.gradle instead)
- Limited AST transformations (`@CompileStatic` works, others unreliable)
- Auto-complete for custom keywords can be inconsistent in the IDE
- Thread safety: parallel TSC uses separate classloaders per suite
- No interactive REPL (use `println` or `KeywordUtil.logInfo` for debugging)
