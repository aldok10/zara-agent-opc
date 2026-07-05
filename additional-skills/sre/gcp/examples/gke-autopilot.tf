resource "google_container_cluster" "primary" {
  name     = "${var.project}-${var.environment}"
  location = var.region
  project  = var.project_id

  enable_autopilot = true

  release_channel {
    channel = var.release_channel
  }

  network    = var.network_id
  subnetwork = var.subnetwork_id

  ip_allocation_policy {
    cluster_secondary_range_name  = var.pods_range_name
    services_secondary_range_name = var.services_range_name
  }

  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = var.private_endpoint
    master_ipv4_cidr_block  = var.master_ipv4_cidr
  }

  dynamic "master_authorized_networks_config" {
    for_each = length(var.authorized_networks) > 0 ? [1] : []
    content {
      dynamic "cidr_blocks" {
        for_each = var.authorized_networks
        content {
          cidr_block   = cidr_blocks.value.cidr
          display_name = cidr_blocks.value.name
        }
      }
    }
  }

  fleet {
    project = var.fleet_project_id != "" ? var.fleet_project_id : var.project_id
  }

  gateway_api_config {
    channel = "CHANNEL_STANDARD"
  }

  binary_authorization {
    evaluation_mode = var.enable_binary_auth ? "PROJECT_SINGLETON_POLICY_ENFORCE" : "DISABLED"
  }

  security_posture_config {
    mode               = "BASIC"
    vulnerability_mode = "VULNERABILITY_BASIC"
  }

  dns_config {
    cluster_dns        = "CLOUD_DNS"
    cluster_dns_scope  = "CLUSTER_SCOPE"
    cluster_dns_domain = "${var.project}.local"
  }

  logging_config {
    enable_components = [
      "SYSTEM_COMPONENTS",
      "WORKLOADS",
      "APISERVER",
      "CONTROLLER_MANAGER",
      "SCHEDULER"
    ]
  }

  monitoring_config {
    enable_components = [
      "SYSTEM_COMPONENTS",
      "APISERVER",
      "CONTROLLER_MANAGER",
      "SCHEDULER",
      "STORAGE",
      "POD",
      "DAEMONSET",
      "DEPLOYMENT",
      "STATEFULSET",
      "HPA"
    ]
    managed_prometheus {
      enabled = true
    }
  }

  maintenance_policy {
    recurring_window {
      start_time = var.maintenance_start_time
      end_time   = var.maintenance_end_time
      recurrence = var.maintenance_recurrence
    }
  }

  deletion_protection = var.deletion_protection
}

resource "google_gke_hub_membership" "primary" {
  count         = var.fleet_project_id != "" ? 1 : 0
  membership_id = google_container_cluster.primary.name
  project       = var.fleet_project_id

  endpoint {
    gke_cluster {
      resource_link = google_container_cluster.primary.id
    }
  }
}

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "project" {
  description = "Project name for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
}

variable "network_id" {
  description = "VPC network self_link"
  type        = string
}

variable "subnetwork_id" {
  description = "Subnetwork self_link"
  type        = string
}

variable "pods_range_name" {
  description = "Secondary range name for pods"
  type        = string
}

variable "services_range_name" {
  description = "Secondary range name for services"
  type        = string
}

variable "master_ipv4_cidr" {
  description = "CIDR for the control plane VPC"
  type        = string
  default     = "172.16.0.0/28"
}

variable "private_endpoint" {
  description = "Enable private endpoint for control plane"
  type        = bool
  default     = false
}

variable "authorized_networks" {
  description = "List of authorized networks for control plane access"
  type = list(object({
    name = string
    cidr = string
  }))
  default = []
}

variable "release_channel" {
  description = "Release channel (RAPID, REGULAR, STABLE)"
  type        = string
  default     = "REGULAR"
}

variable "fleet_project_id" {
  description = "Fleet host project ID (empty to use same project)"
  type        = string
  default     = ""
}

variable "enable_binary_auth" {
  description = "Enable Binary Authorization"
  type        = bool
  default     = false
}

variable "maintenance_start_time" {
  description = "Maintenance window start (RFC 3339)"
  type        = string
  default     = "2025-01-01T02:00:00Z"
}

variable "maintenance_end_time" {
  description = "Maintenance window end (RFC 3339)"
  type        = string
  default     = "2025-01-01T06:00:00Z"
}

variable "maintenance_recurrence" {
  description = "Maintenance recurrence (RFC 5545 RRULE)"
  type        = string
  default     = "FREQ=WEEKLY;BYDAY=SA,SU"
}

variable "deletion_protection" {
  description = "Enable deletion protection"
  type        = bool
  default     = true
}

output "cluster_id" {
  value = google_container_cluster.primary.id
}

output "cluster_name" {
  value = google_container_cluster.primary.name
}

output "cluster_endpoint" {
  value     = google_container_cluster.primary.endpoint
  sensitive = true
}

output "cluster_ca_certificate" {
  value     = google_container_cluster.primary.master_auth[0].cluster_ca_certificate
  sensitive = true
}
