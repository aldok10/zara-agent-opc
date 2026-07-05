# GCP Serverless

Cloud Run, Cloud Functions, and Eventarc for serverless compute and eventing.

## When to Load
- Deploying containers to Cloud Run
- Building event-driven functions with Cloud Functions (2nd gen)
- Wiring events with Eventarc
- Choosing between Cloud Run and Cloud Functions

## Key Concepts

**Cloud Run:** fully managed container platform. Any container that listens on a port. Scale to zero, concurrency up to 1000 per instance, 60 min timeout.

**Cloud Functions (2nd gen):** built on Cloud Run. Source-based deployment. Triggers: HTTP, CloudEvents (Eventarc), Pub/Sub, Cloud Storage.

**Eventarc:** unified eventing. Routes events from 130+ Google sources, custom apps, and third-party via Cloud Audit Logs or direct integrations.

**Decision:** Use Cloud Run for containers, multi-route apps, WebSockets, gRPC. Use Functions for single-purpose event handlers with simple deployment.

## Patterns

**Cloud Run service (Terraform):**
```hcl
resource "google_cloud_run_v2_service" "api" {
  name     = "api-service"
  location = "us-central1"

  template {
    scaling {
      min_instance_count = 1
      max_instance_count = 100
    }
    containers {
      image = "us-docker.pkg.dev/project/repo/api:latest"
      ports { container_port = 8080 }
      resources {
        limits = { cpu = "2", memory = "1Gi" }
        cpu_idle = true
      }
      env {
        name = "DB_HOST"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db.secret_id
            version = "latest"
          }
        }
      }
    }
    service_account = google_service_account.api.email
  }
}
```

**Cloud Function with Eventarc (Cloud Storage trigger):**
```python
import functions_framework
from cloudevents.http import CloudEvent

@functions_framework.cloud_event
def process_upload(cloud_event: CloudEvent):
    data = cloud_event.data
    bucket = data["bucket"]
    name = data["name"]
    print(f"Processing gs://{bucket}/{name}")
```

**Eventarc trigger (Terraform):**
```hcl
resource "google_eventarc_trigger" "storage" {
  name     = "storage-upload"
  location = "us-central1"

  matching_criteria {
    attribute = "type"
    value     = "google.cloud.storage.object.v1.finalized"
  }
  matching_criteria {
    attribute = "bucket"
    value     = google_storage_bucket.uploads.name
  }

  destination {
    cloud_run_service {
      service = google_cloud_run_v2_service.processor.name
      region  = "us-central1"
    }
  }

  service_account = google_service_account.eventarc.email
}
```

## Gotchas
- Cloud Run startup probe failures cause 503s -- configure startupProbe for slow-starting apps
- `cpu_idle = true` (CPU throttled between requests) breaks background tasks
- Cloud Functions 2nd gen cold starts are longer than 1st gen due to Cloud Run foundation
- Eventarc requires the event receiver SA to have `roles/run.invoker`
- Cloud Run max request timeout is 60 min; idle instances with `min_instance_count > 0` charge for CPU
- VPC connector required for Cloud Run to access private resources (adds latency and cost)
- Concurrency setting: too high starves memory per request; too low wastes instances

## Verification
- `gcloud run services describe <service> --format="value(status.url)"`
- `gcloud run revisions list --service=<service>` for deployment history
- `gcloud eventarc triggers describe <trigger> --location=<region>`
- Cloud Run metrics: request latency, instance count, container CPU/memory
- `gcloud functions logs read <function>` for function execution logs
