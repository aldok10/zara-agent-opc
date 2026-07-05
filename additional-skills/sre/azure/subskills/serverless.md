# Azure Serverless

Azure Functions, Container Apps, and Logic Apps for event-driven workloads.

## When to Load
- Choosing between Functions, Container Apps, and Logic Apps
- Configuring event-driven scaling
- Setting up Dapr integration with Container Apps
- Designing serverless event processing pipelines

## Key Concepts

**Azure Functions:** code-first, event-triggered compute. Consumption (scale to zero, 5 min timeout) vs Premium (pre-warmed, VNet, 60 min) vs Dedicated plans.

**Container Apps:** managed Kubernetes-based platform. Supports any container, scale to zero, KEDA triggers, Dapr sidecars. No cluster management.

**Logic Apps:** workflow orchestration with 400+ connectors. Standard (single-tenant, VNet) vs Consumption (multi-tenant). Low-code/no-code friendly.

**Decision guide:**
- Short-lived event handlers: Functions
- Long-running containers with HTTP/event scaling: Container Apps
- Integration workflows with many SaaS connectors: Logic Apps

## Patterns

**Azure Function with Event Hub trigger (Python):**
```python
import azure.functions as func
import logging

app = func.FunctionApp()

@app.event_hub_message_trigger(
    arg_name="events",
    event_hub_name="telemetry",
    connection="EventHubConnection",
    cardinality=func.Cardinality.MANY
)
def process_telemetry(events: list[func.EventHubEvent]):
    for event in events:
        logging.info(f"Event: {event.get_body().decode()}")
```

**Container Apps with scaling rule (Bicep):**
```bicep
resource containerApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: 'order-processor'
  properties: {
    configuration: {
      activeRevisionsMode: 'Single'
      secrets: [{ name: 'queue-conn', value: queueConnectionString }]
    }
    template: {
      containers: [{
        name: 'processor'
        image: 'myregistry.azurecr.io/processor:latest'
        resources: { cpu: json('0.5'), memory: '1Gi' }
      }]
      scale: {
        minReplicas: 0
        maxReplicas: 30
        rules: [{
          name: 'queue-scaling'
          azureQueue: {
            queueName: 'orders'
            queueLength: 10
            auth: [{ secretRef: 'queue-conn', triggerParameter: 'connection' }]
          }
        }]
      }
    }
  }
}
```

**Container Apps with Dapr:**
```yaml
properties:
  configuration:
    dapr:
      enabled: true
      appId: "order-service"
      appPort: 8080
      appProtocol: "http"
```

## Gotchas
- Functions Consumption plan has 1.5 GB memory limit and cold starts
- Container Apps revision-scope changes (secrets, scale rules) create new revisions
- Logic Apps Standard uses Storage Account extensively -- costs add up
- Functions durable entities have serialization constraints
- Container Apps ingress is L7 only -- no TCP/UDP passthrough on Consumption plan
- Event Hub triggered functions: partition count limits max parallelism

## Verification
- `az functionapp show --name <app>` for runtime status
- `az containerapp revision list -g <rg> -n <app>` for active revisions
- Application Insights live metrics for function invocations
- Container Apps system logs: `az containerapp logs show`
- `func start` for local Functions testing
