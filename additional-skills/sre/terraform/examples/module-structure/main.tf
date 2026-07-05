locals {
  full_name = "${var.name}-${var.environment}"

  default_tags = merge(var.tags, {
    ManagedBy   = "terraform"
    Module      = var.name
    Environment = var.environment
  })
}

resource "aws_s3_bucket" "this" {
  bucket = "${local.full_name}-storage"
  tags   = local.default_tags
}

resource "aws_s3_bucket_versioning" "this" {
  bucket = aws_s3_bucket.this.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "this" {
  bucket = aws_s3_bucket.this.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "this" {
  bucket = aws_s3_bucket.this.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
