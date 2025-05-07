#!/bin/bash
# Deploy the LAMP stack infrastructure to AWS
# This script deploys the infrastructure to AWS using Terraform and Ansible

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

# Check AWS credentials
check_aws_credentials() {
  section "Checking AWS credentials"
  
  if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    error "AWS credentials not found. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables."
  fi
  
  if [ -z "$AWS_REGION" ]; then
    echo "AWS_REGION not set, defaulting to us-west-2"
    export AWS_REGION="us-west-2"
    export TF_VAR_aws_region="us-west-2"
  else
    export TF_VAR_aws_region="$AWS_REGION"
  fi
  
  # Test AWS credentials
  aws sts get-caller-identity > /dev/null 2>&1 || error "Failed to authenticate with AWS. Please check your credentials."
  
  success "AWS credentials validated"
}

# Initialize Terraform
init_terraform() {
  section "Initializing Terraform"
  
  cd terraform
  
  # Initialize Terraform
  terraform init || error "Failed to initialize Terraform"
  
  success "Terraform initialized"
  cd ..
}

# Plan Terraform changes
plan_terraform() {
  section "Planning Terraform changes"
  
  cd terraform
  
  # Create plan
  terraform plan -out=tfplan || error "Failed to create Terraform plan"
  
  success "Terraform plan created"
  cd ..
}

# Apply Terraform configuration
apply_terraform() {
  section "Applying Terraform configuration"
  
  cd terraform
  
  # Apply plan
  terraform apply tfplan || error "Failed to apply Terraform configuration"
  
  # Extract outputs for Ansible
  terraform output -json > ../ansible/terraform_outputs.json
  
  success "Terraform configuration applied"
  cd ..
}

# Wait for instances to be ready
wait_for_instances() {
  section "Waiting for instances to be ready"
  
  # Extract instance IDs from Terraform output
  INSTANCE_IDS=$(cd terraform && terraform output -json web_instance_ids | jq -r '.[]')
  
  for ID in $INSTANCE_IDS; do
    echo "Waiting for instance $ID to be ready..."
    aws ec2 wait instance-status-ok --instance-ids $ID || error "Instance $ID failed to reach ready state"
  done
  
  # Give some extra time for services to start
  echo "Waiting 30 seconds for services to start..."
  sleep 30
  
  success "All instances are ready"
}

# Run Ansible playbook
run_ansible() {
  section "Running Ansible playbook"
  
  cd ansible
  
  # Set environment variables for Ansible
  export ANSIBLE_HOST_KEY_CHECKING=False
  export ENVIRONMENT=production
  
  # Run Ansible with dynamic inventory
  ansible-playbook -i inventory/aws_ec2.yml site.yml || error "Failed to run Ansible playbook"
  
  success "Ansible playbook executed successfully"
  cd ..
}

# Display infrastructure information
show_info() {
  section "Infrastructure Information"
  
  cd terraform
  
  echo "Load Balancer DNS Name: $(terraform output -raw alb_dns_name)"
  echo "RDS Endpoint: $(terraform output -raw rds_endpoint)"
  echo "Web Server IPs: $(terraform output -json web_instance_public_ips | jq -r '.[]' | tr '\n' ', ' | sed 's/,$//')"
  
  if [ -n "$(terraform output -raw route53_domain_name)" ]; then
    echo "Domain Name: $(terraform output -raw route53_domain_name)"
  fi
  
  cd ..
  
  success "Deployment completed successfully!"
}

# Main execution
main() {
  section "Starting AWS LAMP Stack Deployment"
  
  # Check if this is a CI/CD environment
  if [ -n "$CI" ]; then
    echo "CI/CD environment detected, skipping interactive prompts"
    INTERACTIVE=false
  else
    INTERACTIVE=true
  fi
  
  check_aws_credentials
  init_terraform
  plan_terraform
  
  if [ "$INTERACTIVE" = true ]; then
    read -p "Do you want to apply the Terraform plan? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "Deployment cancelled."
      exit 0
    fi
  fi
  
  apply_terraform
  wait_for_instances
  run_ansible
  show_info
  
  section "Deployment completed successfully!"
}

# Run main function
main
