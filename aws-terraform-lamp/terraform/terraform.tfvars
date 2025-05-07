# Example terraform.tfvars file for LAMP Stack on AWS
# Customize these values for your environment

# General
project_name = "lamp-stack"
environment  = "dev"
region       = "us-west-2"

tags = {
  Owner       = "DevOps"
  Project     = "LAMP Stack"
  Environment = "Development"
  Terraform   = "true"
}

# Networking
vpc_cidr             = "10.0.0.0/16"
availability_zones   = ["us-west-2a", "us-west-2b"]
public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24"]
private_subnet_cidrs = ["10.0.3.0/24", "10.0.4.0/24"]

# Security
allowed_ips = ["0.0.0.0/0"] # Restrict this to your IP in production

# Database
db_name              = "lampdb"
db_username          = "admin"
db_password          = "YourStrongPasswordHere" # Change this to a secure password
db_instance_class    = "db.t3.micro"
db_allocated_storage = 20
db_engine            = "mysql"
db_engine_version    = "8.0"
db_multi_az          = true
db_backup_retention_period = 7

# Compute
instance_type       = "t3.micro"
key_name            = "your-key-pair" # Change this to your key pair name
asg_min_size        = 2
asg_max_size        = 4
asg_desired_capacity = 2
efs_mount_point     = "/var/www/html/shared"

# Load Balancing
health_check_path = "/health.php"
certificate_arn   = "" # Add your certificate ARN if you have one

# DNS
domain_name        = "" # Add your domain name if you have one
subdomain          = "lamp" # Subdomain for the application
create_www_record  = true
create_certificate = true

# WAF
waf_allowed_ips    = [] # Add specific IPs to allow
waf_blocked_ips    = [] # Add specific IPs to block
waf_rate_limit     = 1000
waf_enable_logging = true

# Monitoring
alarm_actions = [] # Add SNS topic ARNs for alarms
ok_actions    = [] # Add SNS topic ARNs for OK notifications
