# AWS Budget Alert with Cost Anomaly Detection
# Terraform configuration for cost governance guardrails

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.60"
    }
  }
}

variable "budget_name" {
  description = "Name for the budget"
  type        = string
  default     = "monthly-service-budget"
}

variable "monthly_budget_amount" {
  description = "Monthly budget limit in USD"
  type        = string
  default     = "10000"
}

variable "alert_email" {
  description = "Email addresses for budget alerts"
  type        = list(string)
}

variable "slack_webhook_url" {
  description = "Slack webhook URL for cost alerts"
  type        = string
  sensitive   = true
}

variable "team_name" {
  description = "Team name for cost allocation filtering"
  type        = string
}

variable "environment" {
  description = "Environment (production, staging, development)"
  type        = string
  default     = "production"
}

resource "aws_budgets_budget" "monthly" {
  name         = "${var.team_name}-${var.budget_name}"
  budget_type  = "COST"
  limit_amount = var.monthly_budget_amount
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  cost_filter {
    name   = "TagKeyValue"
    values = ["user:team$${var.team_name}"]
  }

  cost_filter {
    name   = "TagKeyValue"
    values = ["user:environment$${var.environment}"]
  }

  cost_types {
    include_credit             = false
    include_discount           = true
    include_other_subscription = true
    include_recurring          = true
    include_refund             = false
    include_subscription       = true
    include_support            = false
    include_tax                = false
    include_upfront            = true
    use_blended                = false
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.alert_email
    subscriber_sns_topic_arns  = [aws_sns_topic.cost_alerts.arn]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.alert_email
    subscriber_sns_topic_arns  = [aws_sns_topic.cost_alerts.arn]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 90
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = var.alert_email
    subscriber_sns_topic_arns  = [aws_sns_topic.cost_alerts.arn]
  }
}

resource "aws_sns_topic" "cost_alerts" {
  name = "${var.team_name}-cost-alerts"

  tags = {
    team        = var.team_name
    environment = var.environment
    managed-by  = "terraform"
  }
}

resource "aws_sns_topic_subscription" "slack" {
  topic_arn = aws_sns_topic.cost_alerts.arn
  protocol  = "https"
  endpoint  = var.slack_webhook_url
}

resource "aws_ce_anomaly_monitor" "service" {
  name              = "${var.team_name}-cost-anomaly-monitor"
  monitor_type      = "DIMENSIONAL"
  monitor_dimension = "SERVICE"

  tags = {
    team        = var.team_name
    managed-by  = "terraform"
  }
}

resource "aws_ce_anomaly_monitor" "custom" {
  name         = "${var.team_name}-custom-anomaly-monitor"
  monitor_type = "CUSTOM"

  monitor_specification = jsonencode({
    And = [
      {
        Tags = {
          Key          = "team"
          Values       = [var.team_name]
          MatchOptions = ["EQUALS"]
        }
      },
      {
        Tags = {
          Key          = "environment"
          Values       = [var.environment]
          MatchOptions = ["EQUALS"]
        }
      }
    ]
  })

  tags = {
    team        = var.team_name
    managed-by  = "terraform"
  }
}

resource "aws_ce_anomaly_subscription" "alerts" {
  name      = "${var.team_name}-anomaly-alerts"
  frequency = "IMMEDIATE"

  monitor_arn_list = [
    aws_ce_anomaly_monitor.service.arn,
    aws_ce_anomaly_monitor.custom.arn,
  ]

  subscriber {
    type    = "SNS"
    address = aws_sns_topic.cost_alerts.arn
  }

  threshold_expression {
    dimension {
      key           = "ANOMALY_TOTAL_IMPACT_ABSOLUTE"
      values        = ["100"]
      match_options = ["GREATER_THAN_OR_EQUAL"]
    }
  }

  tags = {
    team        = var.team_name
    managed-by  = "terraform"
  }
}

resource "aws_budgets_budget" "daily_anomaly" {
  name         = "${var.team_name}-daily-anomaly-detection"
  budget_type  = "COST"
  limit_amount = tostring(tonumber(var.monthly_budget_amount) / 30 * 1.2)
  limit_unit   = "USD"
  time_unit    = "DAILY"

  cost_filter {
    name   = "TagKeyValue"
    values = ["user:team$${var.team_name}"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 120
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.alert_email
    subscriber_sns_topic_arns  = [aws_sns_topic.cost_alerts.arn]
  }
}

output "budget_id" {
  description = "AWS Budget ID for reference"
  value       = aws_budgets_budget.monthly.id
}

output "sns_topic_arn" {
  description = "SNS topic ARN for cost alert subscriptions"
  value       = aws_sns_topic.cost_alerts.arn
}

output "anomaly_monitor_arns" {
  description = "Cost anomaly monitor ARNs"
  value = [
    aws_ce_anomaly_monitor.service.arn,
    aws_ce_anomaly_monitor.custom.arn,
  ]
}
