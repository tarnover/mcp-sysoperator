# WAF Module
# Creates AWS WAF Web ACL and rules for the ALB

# AWS WAF IP Set for allowed IPs (if provided)
resource "aws_wafv2_ip_set" "allowed_ips" {
  count              = length(var.allowed_ips) > 0 ? 1 : 0
  name               = "${var.project_name}-${var.environment}-allowed-ips"
  description        = "IP set for allowed IPs"
  scope              = "REGIONAL"
  ip_address_version = "IPV4"
  addresses          = var.allowed_ips
  
  tags = var.tags
}

# AWS WAF IP Set for blocked IPs (if provided)
resource "aws_wafv2_ip_set" "blocked_ips" {
  count              = length(var.blocked_ips) > 0 ? 1 : 0
  name               = "${var.project_name}-${var.environment}-blocked-ips"
  description        = "IP set for blocked IPs"
  scope              = "REGIONAL"
  ip_address_version = "IPV4"
  addresses          = var.blocked_ips
  
  tags = var.tags
}

# AWS WAF Web ACL
resource "aws_wafv2_web_acl" "main" {
  name        = "${var.project_name}-${var.environment}-web-acl"
  description = "WAF Web ACL for ${var.project_name}-${var.environment}"
  scope       = "REGIONAL"
  
  default_action {
    allow {}
  }
  
  # Rule to block blocked IPs
  dynamic "rule" {
    for_each = length(var.blocked_ips) > 0 ? [1] : []
    content {
      name     = "block-blocked-ips"
      priority = 1
      
      action {
        block {}
      }
      
      statement {
        ip_set_reference_statement {
          arn = aws_wafv2_ip_set.blocked_ips[0].arn
        }
      }
      
      visibility_config {
        cloudwatch_metrics_enabled = true
        metric_name                = "${var.project_name}-${var.environment}-blocked-ips"
        sampled_requests_enabled   = true
      }
    }
  }
  
  # Rule to allow allowed IPs
  dynamic "rule" {
    for_each = length(var.allowed_ips) > 0 ? [1] : []
    content {
      name     = "allow-allowed-ips"
      priority = 2
      
      action {
        allow {}
      }
      
      statement {
        ip_set_reference_statement {
          arn = aws_wafv2_ip_set.allowed_ips[0].arn
        }
      }
      
      visibility_config {
        cloudwatch_metrics_enabled = true
        metric_name                = "${var.project_name}-${var.environment}-allowed-ips"
        sampled_requests_enabled   = true
      }
    }
  }
  
  # AWS Managed Rules - Common Rule Set
  rule {
    name     = "aws-managed-common"
    priority = 10
    
    override_action {
      none {}
    }
    
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }
    
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project_name}-${var.environment}-aws-managed-common"
      sampled_requests_enabled   = true
    }
  }
  
  # AWS Managed Rules - SQL Injection Rule Set
  rule {
    name     = "aws-managed-sql-injection"
    priority = 20
    
    override_action {
      none {}
    }
    
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }
    
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project_name}-${var.environment}-aws-managed-sql-injection"
      sampled_requests_enabled   = true
    }
  }
  
  # AWS Managed Rules - PHP Rule Set
  rule {
    name     = "aws-managed-php"
    priority = 30
    
    override_action {
      none {}
    }
    
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesPHPRuleSet"
        vendor_name = "AWS"
      }
    }
    
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project_name}-${var.environment}-aws-managed-php"
      sampled_requests_enabled   = true
    }
  }
  
  # Rate Limiting Rule
  rule {
    name     = "rate-limit"
    priority = 40
    
    action {
      block {}
    }
    
    statement {
      rate_based_statement {
        limit              = var.rate_limit
        aggregate_key_type = "IP"
      }
    }
    
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project_name}-${var.environment}-rate-limit"
      sampled_requests_enabled   = true
    }
  }
  
  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.project_name}-${var.environment}-web-acl"
    sampled_requests_enabled   = true
  }
  
  tags = var.tags
}

# Associate WAF Web ACL with ALB
resource "aws_wafv2_web_acl_association" "main" {
  resource_arn = var.alb_arn
  web_acl_arn  = aws_wafv2_web_acl.main.arn
}

# CloudWatch Logging for WAF
resource "aws_wafv2_web_acl_logging_configuration" "main" {
  count                   = var.enable_logging ? 1 : 0
  log_destination_configs = [aws_cloudwatch_log_group.waf[0].arn]
  resource_arn            = aws_wafv2_web_acl.main.arn
  
  redacted_fields {
    single_header {
      name = "authorization"
    }
    
    single_header {
      name = "cookie"
    }
  }
}

# CloudWatch Log Group for WAF
resource "aws_cloudwatch_log_group" "waf" {
  count             = var.enable_logging ? 1 : 0
  name              = "/aws/waf/${var.project_name}-${var.environment}"
  retention_in_days = 30
  
  tags = var.tags
}
