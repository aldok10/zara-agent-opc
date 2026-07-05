data "aws_caller_identity" "current" {}

locals {
  github_oidc_provider_url = "token.actions.githubusercontent.com"
}

resource "aws_iam_openid_connect_provider" "github" {
  url = "https://${local.github_oidc_provider_url}"

  client_id_list = ["sts.amazonaws.com"]

  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea1",
    "1c58a3a8518e8759bf075b76b750d4f2df264fcd"
  ]

  tags = {
    Name      = "github-actions"
    ManagedBy = "terraform"
  }
}

resource "aws_iam_role" "github_actions" {
  name = "${var.project}-github-actions-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${local.github_oidc_provider_url}:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "${local.github_oidc_provider_url}:sub" = "repo:${var.github_org}/${var.github_repo}:${var.github_sub_filter}"
          }
        }
      }
    ]
  })

  max_session_duration = 3600

  tags = {
    Name        = "${var.project}-github-actions"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "aws_iam_role_policy" "github_actions_ecr" {
  name = "ecr-push"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ECRAuth"
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken"
        ]
        Resource = "*"
      },
      {
        Sid    = "ECRPush"
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload"
        ]
        Resource = var.ecr_repository_arns
      }
    ]
  })
}

resource "aws_iam_role_policy" "github_actions_deploy" {
  count = var.enable_deploy_permissions ? 1 : 0
  name  = "deploy"
  role  = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EKSDescribe"
        Effect = "Allow"
        Action = [
          "eks:DescribeCluster",
          "eks:ListClusters"
        ]
        Resource = var.eks_cluster_arns
      },
      {
        Sid    = "STSGetCaller"
        Effect = "Allow"
        Action = [
          "sts:GetCallerIdentity"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy" "github_actions_s3_state" {
  count = var.enable_terraform_permissions ? 1 : 0
  name  = "terraform-state"
  role  = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "S3State"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Resource = [
          var.terraform_state_bucket_arn,
          "${var.terraform_state_bucket_arn}/*"
        ]
      },
      {
        Sid    = "DynamoDBLock"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:DeleteItem"
        ]
        Resource = var.terraform_lock_table_arn
      }
    ]
  })
}

variable "project" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment (e.g., ref:refs/heads/main, environment:production)"
  type        = string
}

variable "github_org" {
  description = "GitHub organization"
  type        = string
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
}

variable "github_sub_filter" {
  description = "Subject claim filter (e.g., ref:refs/heads/main, environment:production)"
  type        = string
  default     = "ref:refs/heads/main"
}

variable "ecr_repository_arns" {
  description = "ECR repository ARNs to allow push"
  type        = list(string)
  default     = []
}

variable "eks_cluster_arns" {
  description = "EKS cluster ARNs for deploy access"
  type        = list(string)
  default     = []
}

variable "enable_deploy_permissions" {
  description = "Enable EKS deploy permissions"
  type        = bool
  default     = false
}

variable "enable_terraform_permissions" {
  description = "Enable Terraform state access permissions"
  type        = bool
  default     = false
}

variable "terraform_state_bucket_arn" {
  description = "S3 bucket ARN for Terraform state"
  type        = string
  default     = ""
}

variable "terraform_lock_table_arn" {
  description = "DynamoDB table ARN for Terraform state locking"
  type        = string
  default     = ""
}

output "role_arn" {
  description = "ARN of the GitHub Actions IAM role"
  value       = aws_iam_role.github_actions.arn
}

output "oidc_provider_arn" {
  description = "ARN of the GitHub OIDC provider"
  value       = aws_iam_openid_connect_provider.github.arn
}
