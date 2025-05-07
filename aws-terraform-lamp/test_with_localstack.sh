#!/bin/bash
# Test the LAMP stack infrastructure with LocalStack
# This script sets up and tests the infrastructure using LocalStack

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Print section header
section() {
  echo -e "\n${YELLOW}=== $1 ===${NC}\n"
}

# Print success message
success() {
  echo -e "${GREEN}✓ $1${NC}"
}

# Print error message and exit
error() {
  echo -e "${RED}✗ $1${NC}"
  exit 1
}

# Check if LocalStack is running
check_localstack() {
  section "Checking LocalStack"
  
  if ! command -v localstack &> /dev/null; then
    error "LocalStack is not installed. Please install it first."
  fi
  
  if ! curl -s http://localhost:4566/_localstack/health | grep -q "running"; then
    error "LocalStack is not running. Please start it with 'localstack start' first."
  fi
  
  success "LocalStack is running"
}

# Initialize Terraform
init_terraform() {
  section "Initializing Terraform"
  
  cd terraform
  
  # Create a local backend for testing
  cat > backend-local.tf <<EOF
terraform {
  backend "local" {
    path = ".terraform/terraform.tfstate"
  }
}
EOF
  
  # Initialize Terraform with LocalStack provider configuration
  export AWS_ACCESS_KEY_ID="test"
  export AWS_SECRET_ACCESS_KEY="test"
  export AWS_DEFAULT_REGION="us-west-2"
  export TF_VAR_aws_region="us-west-2"
  
  # Create a provider override for LocalStack
  cat > provider-localstack.tf <<EOF
provider "aws" {
  access_key                  = "test"
  secret_key                  = "test"
  region                      = var.aws_region
  s3_use_path_style           = true
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true
  
  endpoints {
    apigateway     = "http://localhost:4566"
    cloudformation = "http://localhost:4566"
    cloudwatch     = "http://localhost:4566"
    dynamodb       = "http://localhost:4566"
    ec2            = "http://localhost:4566"
    es             = "http://localhost:4566"
    elasticache    = "http://localhost:4566"
    firehose       = "http://localhost:4566"
    iam            = "http://localhost:4566"
    kinesis        = "http://localhost:4566"
    lambda         = "http://localhost:4566"
    rds            = "http://localhost:4566"
    redshift       = "http://localhost:4566"
    route53        = "http://localhost:4566"
    s3             = "http://localhost:4566"
    secretsmanager = "http://localhost:4566"
    ses            = "http://localhost:4566"
    sns            = "http://localhost:4566"
    sqs            = "http://localhost:4566"
    ssm            = "http://localhost:4566"
    stepfunctions  = "http://localhost:4566"
    sts            = "http://localhost:4566"
    efs            = "http://localhost:4566"
    elb            = "http://localhost:4566"
    elbv2          = "http://localhost:4566"
    waf            = "http://localhost:4566"
    wafv2          = "http://localhost:4566"
  }
}
EOF
  
  # Initialize Terraform
  terraform init || error "Failed to initialize Terraform"
  
  success "Terraform initialized with LocalStack configuration"
  cd ..
}

# Apply Terraform configuration
apply_terraform() {
  section "Applying Terraform configuration"
  
  cd terraform
  
  # Apply with auto-approve for testing
  terraform apply -auto-approve || error "Failed to apply Terraform configuration"
  
  success "Terraform configuration applied"
  cd ..
}

# Run Ansible playbook with LocalStack inventory
run_ansible() {
  section "Running Ansible playbook"
  
  cd ansible
  
  # Set environment variables for Ansible
  export ANSIBLE_HOST_KEY_CHECKING=False
  export ENVIRONMENT=development
  
  # Run Ansible with LocalStack inventory
  ansible-playbook -i inventory/localstack.yml site.yml || error "Failed to run Ansible playbook"
  
  success "Ansible playbook executed successfully"
  cd ..
}

# Test the deployed infrastructure
test_infrastructure() {
  section "Testing infrastructure"
  
  # Test web server
  echo "Testing web server..."
  curl -s http://localhost/health.php | grep -q "OK" && \
    success "Web server is responding" || \
    error "Web server is not responding"
  
  # Test database connection
  echo "Testing database connection..."
  curl -s http://localhost/db-test.php?format=json | grep -q "connected" && \
    success "Database connection successful" || \
    error "Database connection failed"
  
  # Test EFS mount
  echo "Testing EFS mount..."
  if [ -d "/mnt/efs" ]; then
    success "EFS is mounted"
  else
    error "EFS is not mounted"
  fi
  
  success "All tests passed!"
}

# Clean up resources
cleanup() {
  section "Cleaning up resources"
  
  cd terraform
  
  # Destroy resources
  terraform destroy -auto-approve || error "Failed to destroy Terraform resources"
  
  # Remove temporary files
  rm -f backend-local.tf provider-localstack.tf
  
  success "Resources cleaned up"
  cd ..
}

# Main execution
main() {
  section "Starting LocalStack LAMP Stack Test"
  
  check_localstack
  init_terraform
  apply_terraform
  run_ansible
  test_infrastructure
  
  # Ask if user wants to clean up
  read -p "Do you want to clean up the resources? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    cleanup
  fi
  
  section "Test completed successfully!"
}

# Run main function
main
