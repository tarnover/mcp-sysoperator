# Main Terraform Configuration for LAMP Stack on AWS

# Configure the AWS Provider
provider "aws" {
  region = var.region
  
  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      Terraform   = "true"
    }
  }
}

# Networking Module - VPC, Subnets, Internet Gateway, NAT Gateway, Route Tables
module "networking" {
  source = "./modules/networking"
  
  project_name         = var.project_name
  environment          = var.environment
  vpc_cidr             = var.vpc_cidr
  availability_zones   = var.availability_zones
  public_subnet_cidrs  = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs
  
  tags = var.tags
}

# Security Module - IAM Roles, Security Groups, NACLs
module "security" {
  source = "./modules/security"
  
  project_name = var.project_name
  environment  = var.environment
  vpc_id       = module.networking.vpc_id
  
  allowed_ips = var.allowed_ips
  
  tags = var.tags
}

# Storage Module - EFS
module "storage" {
  source = "./modules/storage"
  
  project_name    = var.project_name
  environment     = var.environment
  vpc_id          = module.networking.vpc_id
  subnet_ids      = module.networking.private_subnet_ids
  security_groups = [module.security.efs_security_group_id]
  
  tags = var.tags
}

# Database Module - RDS
module "database" {
  source = "./modules/database"
  
  project_name    = var.project_name
  environment     = var.environment
  vpc_id          = module.networking.vpc_id
  subnet_ids      = module.networking.private_subnet_ids
  security_groups = [module.security.db_security_group_id]
  
  db_name     = var.db_name
  db_username = var.db_username
  db_password = var.db_password
  
  instance_class    = var.db_instance_class
  allocated_storage = var.db_allocated_storage
  engine            = var.db_engine
  engine_version    = var.db_engine_version
  
  multi_az             = var.db_multi_az
  backup_retention_period = var.db_backup_retention_period
  
  tags = var.tags
}

# Load Balancing Module - ALB
module "loadbalancing" {
  source = "./modules/loadbalancing"
  
  project_name      = var.project_name
  environment       = var.environment
  vpc_id            = module.networking.vpc_id
  subnet_ids        = module.networking.public_subnet_ids
  security_group_id = module.security.alb_security_group_id
  
  health_check_path = var.health_check_path
  certificate_arn   = var.certificate_arn
  
  tags = var.tags
}

# Compute Module - EC2 Auto Scaling Group
module "compute" {
  source = "./modules/compute"
  
  project_name        = var.project_name
  environment         = var.environment
  vpc_id              = module.networking.vpc_id
  subnet_ids          = module.networking.private_subnet_ids
  security_group_id   = module.security.web_security_group_id
  iam_instance_profile = module.security.web_instance_profile_name
  
  instance_type    = var.instance_type
  key_name         = var.key_name
  min_size         = var.asg_min_size
  max_size         = var.asg_max_size
  desired_capacity = var.asg_desired_capacity
  
  target_group_arns = [module.loadbalancing.target_group_arn]
  
  efs_id         = module.storage.efs_id
  efs_mount_point = var.efs_mount_point
  
  db_endpoint = module.database.db_endpoint
  db_name     = var.db_name
  db_username = var.db_username
  db_password = var.db_password
  
  tags = var.tags
}

# DNS Module - Route53
module "dns" {
  source = "./modules/dns"
  
  project_name = var.project_name
  environment  = var.environment
  
  domain_name        = var.domain_name
  subdomain          = var.subdomain
  alb_dns_name       = module.loadbalancing.alb_dns_name
  alb_zone_id        = module.loadbalancing.alb_zone_id
  create_www_record  = var.create_www_record
  create_certificate = var.create_certificate
  
  tags = var.tags
}

# WAF Module - Web Application Firewall
module "waf" {
  source = "./modules/waf"
  
  project_name = var.project_name
  environment  = var.environment
  
  alb_arn      = module.loadbalancing.alb_arn
  allowed_ips  = var.waf_allowed_ips
  blocked_ips  = var.waf_blocked_ips
  rate_limit   = var.waf_rate_limit
  enable_logging = var.waf_enable_logging
  
  tags = var.tags
}

# Monitoring Module - CloudWatch
module "monitoring" {
  source = "./modules/monitoring"
  
  project_name = var.project_name
  environment  = var.environment
  region       = var.region
  
  asg_name        = module.compute.autoscaling_group_name
  db_instance_id  = module.database.db_instance_id
  alb_arn_suffix  = module.loadbalancing.alb_arn_suffix
  efs_id          = module.storage.efs_id
  
  ec2_cpu_alarm_arn = module.compute.scale_up_policy_arn
  rds_cpu_alarm_arn = module.database.high_cpu_alarm_arn
  alb_5xx_alarm_arn = module.loadbalancing.http_5xx_alarm_arn
  
  alarm_actions = var.alarm_actions
  ok_actions    = var.ok_actions
  
  tags = var.tags
}

# Enable CloudTrail
resource "aws_cloudtrail" "main" {
  name                          = "${var.project_name}-${var.environment}-trail"
  s3_bucket_name                = aws_s3_bucket.cloudtrail.id
  s3_key_prefix                 = "prefix"
  include_global_service_events = true
  is_multi_region_trail         = true
  enable_log_file_validation    = true
  
  tags = var.tags
}

# S3 Bucket for CloudTrail
resource "aws_s3_bucket" "cloudtrail" {
  bucket        = "${var.project_name}-${var.environment}-cloudtrail-${random_string.suffix.result}"
  force_destroy = true
  
  tags = var.tags
}

# S3 Bucket Policy for CloudTrail
resource "aws_s3_bucket_policy" "cloudtrail" {
  bucket = aws_s3_bucket.cloudtrail.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AWSCloudTrailAclCheck"
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action   = "s3:GetBucketAcl"
        Resource = aws_s3_bucket.cloudtrail.arn
      },
      {
        Sid    = "AWSCloudTrailWrite"
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.cloudtrail.arn}/prefix/AWSLogs/${data.aws_caller_identity.current.account_id}/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl" = "bucket-owner-full-control"
          }
        }
      }
    ]
  })
}

# Random string for unique S3 bucket names
resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
}

# Get current AWS account ID
data "aws_caller_identity" "current" {}
