---
type: example
title: "AWS Step Functions Order Processing Workflow"
---

# AWS Step Functions Order Processing Workflow

## Context
When you need to orchestrate a multi-step business process with error handling, retries, and compensating transactions. Step Functions give you durable execution with built-in state management.

## Code/Template

### State Machine Definition (ASL)

```json
{
  "Comment": "Order processing: validate -> payment -> inventory -> ship -> notify",
  "StartAt": "ValidateOrder",
  "States": {
    "ValidateOrder": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789:function:validate-order",
      "Next": "ProcessPayment",
      "Catch": [
        {
          "ErrorEquals": ["ValidationError"],
          "Next": "OrderRejected"
        }
      ],
      "TimeoutSeconds": 10
    },
    "ProcessPayment": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789:function:process-payment",
      "Next": "ReserveInventory",
      "Retry": [
        {
          "ErrorEquals": ["PaymentGatewayTimeout"],
          "IntervalSeconds": 2,
          "MaxAttempts": 3,
          "BackoffRate": 2.0
        }
      ],
      "Catch": [
        {
          "ErrorEquals": ["PaymentDeclined"],
          "Next": "OrderRejected"
        },
        {
          "ErrorEquals": ["States.ALL"],
          "Next": "RefundPayment"
        }
      ]
    },
    "ReserveInventory": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789:function:reserve-inventory",
      "Next": "FulfillOrder",
      "Catch": [
        {
          "ErrorEquals": ["OutOfStock"],
          "Next": "RefundPayment"
        }
      ]
    },
    "FulfillOrder": {
      "Type": "Parallel",
      "Branches": [
        {
          "StartAt": "CreateShipment",
          "States": {
            "CreateShipment": {
              "Type": "Task",
              "Resource": "arn:aws:lambda:us-east-1:123456789:function:create-shipment",
              "End": true
            }
          }
        },
        {
          "StartAt": "SendConfirmation",
          "States": {
            "SendConfirmation": {
              "Type": "Task",
              "Resource": "arn:aws:lambda:us-east-1:123456789:function:send-confirmation",
              "End": true
            }
          }
        }
      ],
      "Next": "OrderCompleted",
      "Catch": [
        {
          "ErrorEquals": ["States.ALL"],
          "Next": "ManualReview"
        }
      ]
    },
    "RefundPayment": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789:function:refund-payment",
      "Next": "OrderRejected"
    },
    "OrderCompleted": {
      "Type": "Succeed"
    },
    "OrderRejected": {
      "Type": "Fail",
      "Cause": "Order could not be processed",
      "Error": "OrderProcessingFailed"
    },
    "ManualReview": {
      "Type": "Task",
      "Resource": "arn:aws:states:::sqs:sendMessage.waitForTaskToken",
      "Parameters": {
        "QueueUrl": "https://sqs.us-east-1.amazonaws.com/123456789/manual-review",
        "MessageBody": {
          "taskToken.$": "$$.Task.Token",
          "orderId.$": "$.orderId",
          "reason": "Fulfillment step failed after payment success"
        }
      },
      "TimeoutSeconds": 86400,
      "Next": "OrderCompleted"
    }
  }
}
```

### Lambda Handler (one step)

```python
import json

class PaymentDeclined(Exception):
    pass

class PaymentGatewayTimeout(Exception):
    pass

def handler(event, context):
    """Process payment for an order."""
    order_id = event["orderId"]
    amount = event["totalAmount"]
    payment_method = event["paymentMethod"]

    # Call payment provider (pseudo)
    result = charge_payment(
        order_id=order_id,
        amount_cents=int(amount * 100),
        method=payment_method,
    )

    if result["status"] == "declined":
        raise PaymentDeclined(f"Payment declined for order {order_id}")

    if result["status"] == "timeout":
        raise PaymentGatewayTimeout(f"Gateway timeout for order {order_id}")

    return {
        "orderId": order_id,
        "paymentId": result["payment_id"],
        "totalAmount": amount,
        "paymentStatus": "captured",
    }
```

## Key Points
- Use `Catch` for compensating transactions (refund on inventory failure). Each error type routes to the appropriate recovery path.
- `waitForTaskToken` enables human-in-the-loop: the workflow pauses until an external system calls `SendTaskSuccess` with the token.
- Parallel branches (shipment + notification) run concurrently; if either fails after payment, route to manual review rather than automatic refund to avoid shipping without notification or vice versa.
