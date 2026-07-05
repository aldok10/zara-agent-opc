---
type: example
title: "Getting Started Guide Template"
---

# Getting Started Guide Template

## Context
When onboarding new developers to your API or SDK. A getting started guide must take someone from zero to a working integration in under 10 minutes. Optimize for time-to-first-success, not completeness.

## Code/Template

```markdown
# Getting Started with Acme Payments API

Get your first payment working in under 5 minutes.

## Prerequisites

- Node.js 18+ ([download](https://nodejs.org))
- An Acme account ([sign up free](https://acme.dev/signup))
- Your API key (found in [Dashboard > Settings > API Keys](https://acme.dev/settings/keys))

## 1. Install the SDK

```bash
npm install @acme/payments
```

## 2. Set up your client

Create a file called `payment.ts`:

```typescript
import { AcmeClient } from '@acme/payments';

const acme = new AcmeClient({
  apiKey: process.env.ACME_API_KEY, // Never hardcode this
});
```

> **Security**: Store your API key in environment variables. Never commit it to source control.

## 3. Create a payment

```typescript
const payment = await acme.payments.create({
  amount: 2500,       // Amount in cents ($25.00)
  currency: 'usd',
  description: 'Order #1234',
  customer: {
    email: 'buyer@example.com',
  },
});

console.log(`Payment created: ${payment.id}`);
console.log(`Status: ${payment.status}`);
// => Payment created: pay_1a2b3c4d
// => Status: pending
```

## 4. Run it

```bash
ACME_API_KEY=sk_test_your_key npx tsx payment.ts
```

You should see:

```
Payment created: pay_1a2b3c4d
Status: pending
```

Check the [Dashboard](https://acme.dev/payments) to see your test payment.

## 5. Handle the response

Every API call returns a typed response or throws an `AcmeError`:

```typescript
import { AcmeClient, AcmeError } from '@acme/payments';

try {
  const payment = await acme.payments.create({
    amount: 2500,
    currency: 'usd',
  });

  if (payment.status === 'succeeded') {
    // Payment captured immediately
  } else if (payment.status === 'pending') {
    // Redirect user to payment.redirectUrl
  }
} catch (error) {
  if (error instanceof AcmeError) {
    console.error(`[${error.code}] ${error.message}`);
    // => [insufficient_funds] The card has insufficient funds.
  }
}
```

## What's next?

| Goal | Guide |
|------|-------|
| Accept payments on your website | [Checkout Integration →](/docs/checkout) |
| Get notified when payments complete | [Webhooks →](/docs/webhooks) |
| Go live with real payments | [Production Checklist →](/docs/production) |
| Handle refunds and disputes | [Managing Payments →](/docs/managing) |

## Common issues

**"Invalid API key"** — Make sure you're using a test key (starts with `sk_test_`).
Live keys (starting with `sk_live_`) only work after account verification.

**"Module not found"** — Run `npm install @acme/payments` in your project directory.

**Payment stuck in "pending"** — Test payments in sandbox don't auto-capture.
Use `acme.payments.capture(payment.id)` or enable auto-capture in Dashboard settings.

---

Need help? [Join our Discord](https://discord.gg/acme) or [open a support ticket](https://acme.dev/support).
```

### Structure Rules for Getting Started Guides

1. **Prerequisites** — exactly what they need, with install links
2. **Copy-paste code** — working example, not pseudocode
3. **Expected output** — show what success looks like
4. **Next steps** — table of related guides based on goals
5. **Troubleshooting** — top 3 issues new users hit

## Key Points
- Optimize for copy-paste-run: every code block should work if pasted directly (no `...` or `// your code here` placeholders)
- Show expected output after every command so users can verify they're on track without waiting until the end
- Put the "happy path" first, error handling second—don't front-load complexity before the user has seen success
