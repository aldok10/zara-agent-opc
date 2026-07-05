# References

## AWS Lambda (8 refs)

- **Lambda Documentation** -- https://docs.aws.amazon.com/lambda/latest/dg/ -- Complete AWS Lambda guide
- **Lambda Best Practices** -- https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html -- Official performance guidance
- **Lambda Powertools** -- https://docs.powertools.aws.dev/lambda/python/latest/ -- Opinionated utilities library
- **Lambda SnapStart** -- https://docs.aws.amazon.com/lambda/latest/dg/snapstart.html -- Cold start elimination for Java
- **Lambda Layers** -- https://docs.aws.amazon.com/lambda/latest/dg/chapter-layers.html -- Shared code and dependencies
- **Lambda Extensions** -- https://docs.aws.amazon.com/lambda/latest/dg/lambda-extensions.html -- Observability and tooling hooks
- **Lambda Destinations** -- https://docs.aws.amazon.com/lambda/latest/dg/invocation-async.html -- Async invocation routing
- **Lambda@Edge** -- https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-at-the-edge.html -- Edge compute

## Cold Start Optimization (5 refs)

- **Understanding Cold Starts** -- https://docs.aws.amazon.com/lambda/latest/operatorguide/execution-environments.html -- Execution environment lifecycle
- **Provisioned Concurrency** -- https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html -- Pre-warmed environments
- **Init Duration** -- https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html -- Init phase optimization
- **Lambda Runtime API** -- https://docs.aws.amazon.com/lambda/latest/dg/runtimes-api.html -- Custom runtime interface
- **GraalVM Native for Lambda** -- https://www.graalvm.org/latest/reference-manual/native-image/guides/build-and-run-native-executable-with-remote-jmx/ -- AOT for minimal cold starts

## Event Sources & Triggers (6 refs)

- **Lambda Event Source Mapping** -- https://docs.aws.amazon.com/lambda/latest/dg/invocation-eventsourcemapping.html -- Stream and queue triggers
- **API Gateway Integration** -- https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html -- HTTP trigger
- **SQS Trigger** -- https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html -- Queue processing
- **EventBridge** -- https://docs.aws.amazon.com/eventbridge/latest/userguide/ -- Event routing service
- **S3 Event Notifications** -- https://docs.aws.amazon.com/lambda/latest/dg/with-s3.html -- Object event processing
- **Step Functions** -- https://docs.aws.amazon.com/step-functions/latest/dg/ -- Serverless workflow orchestration

## Google Cloud Functions (4 refs)

- **Cloud Functions Documentation** -- https://cloud.google.com/functions/docs -- GCP serverless functions
- **Cloud Functions 2nd Gen** -- https://cloud.google.com/functions/docs/concepts/version-comparison -- Cloud Run based functions
- **Cloud Run** -- https://cloud.google.com/run/docs -- Container-based serverless
- **Eventarc** -- https://cloud.google.com/eventarc/docs -- GCP event delivery

## Azure Functions (4 refs)

- **Azure Functions Documentation** -- https://learn.microsoft.com/en-us/azure/azure-functions/ -- Microsoft serverless
- **Durable Functions** -- https://learn.microsoft.com/en-us/azure/azure-functions/durable/durable-functions-overview -- Stateful workflows
- **Azure Functions Best Practices** -- https://learn.microsoft.com/en-us/azure/azure-functions/functions-best-practices -- Performance and reliability
- **Azure Container Apps** -- https://learn.microsoft.com/en-us/azure/container-apps/ -- Serverless containers

## Frameworks & Tools (6 refs)

- **Serverless Framework** -- https://www.serverless.com/framework/docs -- Multi-cloud deployment framework
- **SST (Serverless Stack)** -- https://docs.sst.dev/ -- Full-stack serverless framework
- **AWS SAM** -- https://docs.aws.amazon.com/serverless-application-model/ -- Serverless Application Model
- **AWS CDK** -- https://docs.aws.amazon.com/cdk/v2/guide/ -- Infrastructure as code
- **Terraform AWS Lambda** -- https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function -- IaC for Lambda
- **Pulumi** -- https://www.pulumi.com/docs/clouds/aws/guides/lambda/ -- Programming language IaC

## Event-Driven Patterns (5 refs)

- **Event-Driven Architecture** -- https://aws.amazon.com/event-driven-architecture/ -- AWS patterns overview
- **Fan-Out Pattern** -- https://docs.aws.amazon.com/lambda/latest/dg/with-sns.html -- SNS to multiple Lambdas
- **Event Filtering** -- https://docs.aws.amazon.com/lambda/latest/dg/invocation-eventfiltering.html -- Source-level filtering
- **Dead Letter Queues** -- https://docs.aws.amazon.com/lambda/latest/dg/invocation-async.html -- Failed invocation handling
- **Idempotency** -- https://docs.powertools.aws.dev/lambda/python/latest/utilities/idempotency/ -- Safe retries

## Observability (4 refs)

- **Lambda Monitoring** -- https://docs.aws.amazon.com/lambda/latest/dg/lambda-monitoring.html -- CloudWatch integration
- **X-Ray Tracing** -- https://docs.aws.amazon.com/lambda/latest/dg/services-xray.html -- Distributed tracing
- **Lambda Insights** -- https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Lambda-Insights.html -- Enhanced monitoring
- **Datadog Serverless** -- https://docs.datadoghq.com/serverless/ -- Third-party serverless monitoring

## Testing (4 refs)

- **Lambda Testing** -- https://docs.aws.amazon.com/lambda/latest/dg/testing-guide.html -- Official testing strategies
- **LocalStack** -- https://docs.localstack.cloud/ -- Local AWS emulation
- **SAM Local** -- https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-cli-command-reference-sam-local-invoke.html -- Local invocation
- **Artillery** -- https://www.artillery.io/docs -- Load testing for serverless APIs

## Cost & Architecture (4 refs)

- **Lambda Pricing** -- https://aws.amazon.com/lambda/pricing/ -- Pay-per-use cost model
- **Well-Architected Serverless** -- https://docs.aws.amazon.com/wellarchitected/latest/serverless-applications-lens/welcome.html -- Architecture best practices
- **Power Tuning** -- https://github.com/alexcasalboni/aws-lambda-power-tuning -- Memory/cost optimization tool
- **Serverless Patterns** -- https://serverlessland.com/patterns -- AWS serverless pattern collection
