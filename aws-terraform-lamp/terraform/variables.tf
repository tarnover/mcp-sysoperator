# Variables for the LAMP Stack on AWS

# General
variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "lamp-stack"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-west-2"
}

variable "tags" {
  description = "A map of tags to add to all resources"
  type        = map(string)
  default     = {}
}

# Networking
variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["us-west-2a", "us-west-2b"]
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for the public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for the private subnets"
  type        = list(string)
  default     = ["10.0.3.0/24", "10.0.4.0/24"]
}

# Security
variable "allowed_ips" {
  description = "List of allowed IP addresses in CIDR notation"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

# Database
variable "db_name" {
  description = "Name of the database"
  type        = string
  default     = "lampdb"
}

variable "db_username" {
  description = "Username for the database"
  type        = string
  default     = "admin"
}

variable "db_password" {
  description = "Password for the database"
  type        = string
  sensitive   = true
}

variable "db_instance_class" {
  description = "Instance class for the RDS instance"
  type        = string
  default     = "db.t3.micro"
}

variable "db_allocated_storage" {
  description = "Allocated storage for the RDS instance in GB"
  type        = number
  default     = 20
}

variable "db_engine" {
  description = "Database engine for the RDS instance"
  type        = string
  default     = "mysql"
}

variable "db_engine_version" {
  description = "Database engine version for the RDS instance"
  type        = string
  default     = "8.0"
}

variable "db_multi_az" {
  description = "Whether to deploy the RDS instance in multiple availability zones"
  type        = bool
  default     = true
}

variable "db_backup_retention_period" {
  description = "Backup retention period for the RDS instance in days"
  type        = number
  default     = 7
}

# Compute
variable "instance_type" {
  description = "Instance type for the EC2 instances"
  type        = string
  default     = "t3.micro"
}

variable "key_name" {
  description = "Name of the key pair for SSH access"
  type        = string
  default     = ""
}

variable "asg_min_size" {
  description = "Minimum size of the Auto Scaling Group"
  type        = number
  default     = 2
}

variable "asg_max_size" {
  description = "Maximum size of the Auto Scaling Group"
  type        = number
  default     = 4
}

variable "asg_desired_capacity" {
  description = "Desired capacity of the Auto Scaling Group"
  type        = number
  default     = 2
}

variable "efs_mount_point" {
  description = "Mount point for the EFS file system"
  type        = string
  default     = "/var/www/html/shared"
}

# Load Balancing
variable "health_check_path" {
  description = "Path for the ALB health check"
  type        = string
  default     = "/health.php"
}

variable "certificate_arn" {
  description = "ARN of the SSL certificate for HTTPS"
  type        = string
  default     = ""
}

# DNS
variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = ""
}

variable "subdomain" {
  description = "Subdomain for the application"
  type        = string
  default     = ""
}

variable "create_www_record" {
  description = "Whether to create a www record"
  type        = bool
  default     = true
}

variable "create_certificate" {
  description = "Whether to create an ACM certificate"
  type        = bool
  default     = true
}

# WAF
variable "waf_allowed_ips" {
  description = "List of allowed IP addresses in CIDR notation for WAF"
  type        = list(string)
  default     = []
}

variable "waf_blocked_ips" {
  description = "List of blocked IP addresses in CIDR notation for WAF"
  type        = list(string)
  default     = []
}

variable "waf_rate_limit" {
  description = "Rate limit for requests from a single IP for WAF"
  type        = number
  default     = 1000
}

variable "waf_enable_logging" {
  description = "Whether to enable logging for WAF"
  type        = bool
  default     = true
}

# Monitoring
variable "alarm_actions" {
  description = "List of ARNs to notify when the alarm transitions to ALARM state"
  type        = list(string)
  default     = []
}

variable "ok_actions" {
  description = "List of ARNs to notify when the alarm transitions to OK state"
  type        = list(string)
  default     = []
}
