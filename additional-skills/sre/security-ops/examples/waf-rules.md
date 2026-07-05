---
type: example
title: "WAF Rules Configuration (OWASP CRS + Custom)"
---

# WAF Rules Configuration (OWASP CRS + Custom)

## Context
When protecting web applications from common attacks while minimizing false positives. Layered approach: OWASP Core Rule Set for baseline protection, custom rules for application-specific threats, and exceptions for known-good traffic patterns.

## Code/Template

```hcl
# terraform/waf.tf - AWS WAF v2 with managed + custom rules

resource "aws_wafv2_web_acl" "main" {
  name        = "production-web-acl"
  description = "Production WAF with OWASP CRS and custom rules"
  scope       = "REGIONAL" # Use CLOUDFRONT for CDN

  default_action {
    allow {}
  }

  # Rule 1: Rate limiting - DDoS protection
  rule {
    name     = "rate-limit-per-ip"
    priority = 1

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 2000 # requests per 5 minutes per IP
        aggregate_key_type = "IP"

        scope_down_statement {
          not_statement {
            statement {
              ip_set_reference_statement {
                arn = aws_wafv2_ip_set.trusted_ips.arn
              }
            }
          }
        }
      }
    }

    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitPerIP"
    }
  }

  # Rule 2: AWS Managed - Known bad inputs
  rule {
    name     = "aws-managed-known-bad-inputs"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
      }
    }

    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "KnownBadInputs"
    }
  }

  # Rule 3: OWASP CRS - SQL injection
  rule {
    name     = "aws-managed-sqli"
    priority = 3

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesSQLiRuleSet"

        # Exclude known false positives
        rule_action_override {
          name = "SQLi_QUERYARGUMENTS"
          action_to_use {
            count {} # Count instead of block for monitoring
          }
        }
      }
    }

    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "SQLInjection"
    }
  }

  # Rule 4: OWASP CRS - XSS
  rule {
    name     = "aws-managed-xss"
    priority = 4

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesCommonRuleSet"

        # Exclude rules that conflict with rich text editors
        rule_action_override {
          name = "CrossSiteScripting_BODY"
          action_to_use {
            count {}
          }
        }
      }
    }

    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "CommonRuleSet"
    }
  }

  # Rule 5: Custom - Block suspicious user agents
  rule {
    name     = "block-bad-user-agents"
    priority = 5

    action {
      block {}
    }

    statement {
      or_statement {
        statement {
          byte_match_statement {
            search_string         = "sqlmap"
            field_to_match { single_header { name = "user-agent" } }
            text_transformation { priority = 0; type = "LOWERCASE" }
            positional_constraint = "CONTAINS"
          }
        }
        statement {
          byte_match_statement {
            search_string         = "nikto"
            field_to_match { single_header { name = "user-agent" } }
            text_transformation { priority = 0; type = "LOWERCASE" }
            positional_constraint = "CONTAINS"
          }
        }
        statement {
          byte_match_statement {
            search_string         = "dirbuster"
            field_to_match { single_header { name = "user-agent" } }
            text_transformation { priority = 0; type = "LOWERCASE" }
            positional_constraint = "CONTAINS"
          }
        }
      }
    }

    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "BadUserAgents"
    }
  }

  # Rule 6: Custom - Protect login endpoint from brute force
  rule {
    name     = "login-rate-limit"
    priority = 6

    action {
      block {
        custom_response {
          response_code = 429
          custom_response_body_key = "rate-limited"
        }
      }
    }

    statement {
      rate_based_statement {
        limit              = 20 # 20 login attempts per 5 min per IP
        aggregate_key_type = "IP"

        scope_down_statement {
          byte_match_statement {
            search_string         = "/api/auth/login"
            field_to_match { uri_path {} }
            text_transformation { priority = 0; type = "LOWERCASE" }
            positional_constraint = "STARTS_WITH"
          }
        }
      }
    }

    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "LoginRateLimit"
    }
  }

  custom_response_body {
    key          = "rate-limited"
    content      = "{\"error\":\"Too many requests. Please try again later.\"}"
    content_type = "APPLICATION_JSON"
  }

  visibility_config {
    sampled_requests_enabled   = true
    cloudwatch_metrics_enabled = true
    metric_name                = "ProductionWebACL"
  }
}

# Trusted IPs (monitoring, CI/CD, office)
resource "aws_wafv2_ip_set" "trusted_ips" {
  name               = "trusted-ips"
  scope              = "REGIONAL"
  ip_address_version = "IPV4"
  addresses          = var.trusted_ip_cidrs
}
```

## Key Points
- Start managed rules in `count` mode (observe), analyze false positives for 1-2 weeks, then switch to `block`—never deploy blocking rules blind
- Layer rate limits: global (2000 req/5min) for DDoS + endpoint-specific (20/5min for login) for brute force
- Always exclude trusted IPs (monitoring, CI) from rate limits; your own health checks shouldn't trigger blocks
