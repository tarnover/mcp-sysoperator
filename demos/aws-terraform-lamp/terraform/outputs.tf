# Outputs for the LAMP Stack on AWS

# VPC
output "vpc_id" {
  description = "ID of the VPC"
  value       = module.networking.vpc_id
}

output "vpc_cidr" {
  description = "CIDR block of the VPC"
  value       = module.networking.vpc_cidr
}

# Subnets
output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = module.networking.public_subnet_ids
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = module.networking.private_subnet_ids
}

# Security Groups
output "web_security_group_id" {
  description = "ID of the web security group"
  value       = module.security.web_security_group_id
}

output "db_security_group_id" {
  description = "ID of the database security group"
  value       = module.security.db_security_group_id
}

output "alb_security_group_id" {
  description = "ID of the ALB security group"
  value       = module.security.alb_security_group_id
}

output "efs_security_group_id" {
  description = "ID of the EFS security group"
  value       = module.security.efs_security_group_id
}

# IAM
output "web_instance_profile_name" {
  description = "Name of the web instance profile"
  value       = module.security.web_instance_profile_name
}

output "web_instance_profile_arn" {
  description = "ARN of the web instance profile"
  value       = module.security.web_instance_profile_arn
}

# EFS
output "efs_id" {
  description = "ID of the EFS file system"
  value       = module.storage.efs_id
}

output "efs_arn" {
  description = "ARN of the EFS file system"
  value       = module.storage.efs_arn
}

output "efs_dns_name" {
  description = "DNS name of the EFS file system"
  value       = module.storage.efs_dns_name
}

# RDS
output "db_instance_id" {
  description = "ID of the RDS instance"
  value       = module.database.db_instance_id
}

output "db_instance_arn" {
  description = "ARN of the RDS instance"
  value       = module.database.db_instance_arn
}

output "db_endpoint" {
  description = "Endpoint of the RDS instance"
  value       = module.database.db_endpoint
}

output "db_name" {
  description = "Name of the database"
  value       = module.database.db_name
}

output "db_username" {
  description = "Username for the database"
  value       = module.database.db_username
  sensitive   = true
}

# ALB
output "alb_id" {
  description = "ID of the ALB"
  value       = module.loadbalancing.alb_id
}

output "alb_arn" {
  description = "ARN of the ALB"
  value       = module.loadbalancing.alb_arn
}

output "alb_dns_name" {
  description = "DNS name of the ALB"
  value       = module.loadbalancing.alb_dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the ALB"
  value       = module.loadbalancing.alb_zone_id
}

output "target_group_arn" {
  description = "ARN of the target group"
  value       = module.loadbalancing.target_group_arn
}

# EC2 Auto Scaling Group
output "launch_template_id" {
  description = "ID of the launch template"
  value       = module.compute.launch_template_id
}

output "autoscaling_group_id" {
  description = "ID of the Auto Scaling Group"
  value       = module.compute.autoscaling_group_id
}

output "autoscaling_group_name" {
  description = "Name of the Auto Scaling Group"
  value       = module.compute.autoscaling_group_name
}

# DNS
output "domain_name" {
  description = "Domain name for the application"
  value       = module.dns.domain_name
}

output "fqdn" {
  description = "Fully qualified domain name for the application"
  value       = module.dns.fqdn
}

output "certificate_arn" {
  description = "ARN of the ACM certificate"
  value       = module.dns.certificate_arn
}

# WAF
output "web_acl_id" {
  description = "ID of the WAF Web ACL"
  value       = module.waf.web_acl_id
}

output "web_acl_arn" {
  description = "ARN of the WAF Web ACL"
  value       = module.waf.web_acl_arn
}

# Monitoring
output "dashboard_name" {
  description = "Name of the CloudWatch dashboard"
  value       = module.monitoring.dashboard_name
}

output "system_health_alarm_arn" {
  description = "ARN of the system health composite alarm"
  value       = module.monitoring.system_health_alarm_arn
}

output "app_log_group_name" {
  description = "Name of the application log group"
  value       = module.monitoring.app_log_group_name
}

output "access_log_group_name" {
  description = "Name of the access log group"
  value       = module.monitoring.access_log_group_name
}

output "error_log_group_name" {
  description = "Name of the error log group"
  value       = module.monitoring.error_log_group_name
}

# CloudTrail
output "cloudtrail_arn" {
  description = "ARN of the CloudTrail"
  value       = aws_cloudtrail.main.arn
}

output "cloudtrail_s3_bucket_name" {
  description = "Name of the S3 bucket for CloudTrail logs"
  value       = aws_s3_bucket.cloudtrail.id
}

# Application URL
output "application_url" {
  description = "URL of the application"
  value       = module.dns.fqdn != null ? "https://${module.dns.fqdn}" : "http://${module.loadbalancing.alb_dns_name}"
}
