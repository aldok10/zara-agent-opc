# Basic Examples

Simple examples to get started with Zara.

## Example 1: Architecture Review

**Ask Zara:**
```
Review our microservices architecture for a payment processing system
```

**What happens:**
1. Zara engages the `architect` sub-agent
2. Architect analyzes the architecture against DevIQ principles
3. Returns structured feedback with citations

## Example 2: Code Review

**Ask Zara:**
```
Review this function for code smells:

function processOrder(items) {
  let total = 0;
  let discount = 0;
  let tax = 0;
  let shipping = 0;
  let finalTotal = 0;
  
  for (let i = 0; i < items.length; i++) {
    total += items[i].price * items[i].quantity;
  }
  
  if (total > 100) {
    discount = total * 0.1;
  }
  
  tax = (total - discount) * 0.08;
  
  if (total > 50) {
    shipping = 0;
  } else {
    shipping = 5.99;
  }
  
  finalTotal = total - discount + tax + shipping;
  return finalTotal;
}
```

**Expected output:**
- Identifies Long Method smell
- Suggests Extract Method refactoring
- Recommends Strategy pattern for discount calculation

## Example 3: Testing Strategy

**Ask Zara:**
```
Design a testing strategy for our e-commerce checkout system
```

**Expected output:**
- Testing Pyramid distribution
- Unit test boundaries
- Integration test points
- E2E coverage recommendations

## Example 4: Principle Check

**Ask Zara:**
```
Check this code for SOLID principle violations:

class Report {
  generateReport(data) {
    // generates report
  }
  saveToFile(report) {
    // saves to file
  }
  sendEmail(report) {
    // sends via email
  }
  print(report) {
    // prints report
  }
}
```

**Expected output:**
- Identifies SRP violation
- Suggests separating concerns
- Recommends ReportGenerator, ReportRepository, ReportNotifier
