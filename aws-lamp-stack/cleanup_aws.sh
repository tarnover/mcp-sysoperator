#!/bin/bash
# Script to clean up all AWS resources created by the LAMP stack deployment

# Set environment variables
export ENVIRONMENT=aws
export AWS_REGION=${AWS_REGION:-us-east-1}

# Check if AWS credentials are configured
if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
  echo "AWS credentials not found. Please configure your AWS credentials."
  echo "You can set them as environment variables or configure the AWS CLI with 'aws configure'."
  exit 1
fi

# Create a directory for logs
mkdir -p logs

# Prompt for confirmation
echo "WARNING: This script will delete all AWS resources created by the LAMP stack deployment."
echo "This action cannot be undone."
read -p "Are you sure you want to continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Cleanup cancelled."
  exit 0
fi

# Run the cleanup playbook
echo "Cleaning up AWS resources..."
ansible-playbook playbooks/cleanup.yml -v | tee logs/aws_cleanup.log

# Check the result
if [ ${PIPESTATUS[0]} -eq 0 ]; then
  echo "Cleanup completed successfully!"
  echo "All AWS resources have been deleted."
else
  echo "Cleanup failed or completed with warnings. Check logs/aws_cleanup.log for details."
  echo "Some resources may still exist in your AWS account."
fi
