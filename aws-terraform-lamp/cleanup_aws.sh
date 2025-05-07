#!/bin/bash
# Clean up AWS resources created by the LAMP stack infrastructure
# This script destroys all resources created by Terraform

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

# Plan Terraform destroy
plan_destroy() {
  section "Planning Terraform destroy"
  
  cd terraform
  
  # Create destroy plan
  terraform plan -destroy -out=tfdestroyplan || error "Failed to create Terraform destroy plan"
  
  success "Terraform destroy plan created"
  cd ..
}

# Destroy Terraform resources
destroy_terraform() {
  section "Destroying Terraform resources"
  
  cd terraform
  
  # Apply destroy plan
  terraform apply tfdestroyplan || error "Failed to destroy Terraform resources"
  
  success "Terraform resources destroyed"
  cd ..
}

# Clean up local files
cleanup_local() {
  section "Cleaning up local files"
  
  # Remove Terraform state files
  if [ -d "terraform/.terraform" ]; then
    rm -rf terraform/.terraform
  fi
  
  # Remove Terraform plan files
  if [ -f "terraform/tfplan" ]; then
    rm -f terraform/tfplan
  fi
  
  if [ -f "terraform/tfdestroyplan" ]; then
    rm -f terraform/tfdestroyplan
  fi
  
  # Remove Ansible cache
  if [ -d "ansible/.ansible_cache" ]; then
    rm -rf ansible/.ansible_cache
  fi
  
  # Remove Terraform outputs
  if [ -f "ansible/terraform_outputs.json" ]; then
    rm -f ansible/terraform_outputs.json
  fi
  
  success "Local files cleaned up"
}

# Main execution
main() {
  section "Starting AWS LAMP Stack Cleanup"
  
  # Check if this is a CI/CD environment
  if [ -n "$CI" ]; then
    echo "CI/CD environment detected, skipping interactive prompts"
    INTERACTIVE=false
  else
    INTERACTIVE=true
  fi
  
  check_aws_credentials
  init_terraform
  
  if [ "$INTERACTIVE" = true ]; then
    echo -e "${RED}WARNING: This will destroy all resources created by Terraform.${NC}"
    echo -e "${RED}This action cannot be undone.${NC}"
    read -p "Are you sure you want to proceed? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "Cleanup cancelled."
      exit 0
    fi
    
    read -p "Do you want to create a destroy plan first? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      plan_destroy
      
      read -p "Do you want to apply the destroy plan? (y/n) " -n 1 -r
      echo
      if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cleanup cancelled."
        exit 0
      fi
    fi
  fi
  
  # If not interactive or user confirmed, destroy directly
  if [ "$INTERACTIVE" = false ] || [[ ! $REPLY =~ ^[Yy]$ ]]; then
    cd terraform
    terraform destroy -auto-approve || error "Failed to destroy Terraform resources"
    cd ..
  else
    destroy_terraform
  fi
  
  if [ "$INTERACTIVE" = true ]; then
    read -p "Do you want to clean up local files as well? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      cleanup_local
    fi
  else
    cleanup_local
  fi
  
  section "Cleanup completed successfully!"
}

# Run main function
main
