#!/bin/bash
# Script to deploy the LAMP stack to AWS

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
echo "This script will deploy a LAMP stack to AWS in region $AWS_REGION."
echo "This will create real AWS resources that may incur costs."
read -p "Are you sure you want to continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Deployment cancelled."
  exit 0
fi

# Prompt for domain name
read -p "Enter your domain name (leave empty to skip DNS setup): " DOMAIN_NAME
if [ ! -z "$DOMAIN_NAME" ]; then
  # Update the domain name in the group vars
  sed -i "s/domain_name: .*/domain_name: $DOMAIN_NAME/" group_vars/aws.yml
  echo "Domain name set to $DOMAIN_NAME"
fi

# Prompt for SSH key name
read -p "Enter your EC2 key pair name (must exist in AWS): " KEY_NAME
if [ ! -z "$KEY_NAME" ]; then
  # Update the key name in the group vars
  sed -i "s/ec2_key_name: .*/ec2_key_name: $KEY_NAME/" group_vars/aws.yml
  echo "EC2 key name set to $KEY_NAME"
else
  echo "No key name provided. Using default from group_vars/aws.yml."
fi

# Run the main playbook
echo "Running LAMP stack deployment to AWS..."
ansible-playbook playbooks/main.yml -v | tee logs/aws_deployment.log

# Check the result
if [ ${PIPESTATUS[0]} -eq 0 ]; then
  echo "Deployment completed successfully!"
  
  # Display the resources created
  echo "Resources created:"
  echo "==================="
  
  # Load the ALB info
  if [ -f .alb_info.yml ]; then
    ALB_DNS=$(grep alb_dns_name .alb_info.yml | cut -d' ' -f2)
    echo "Load Balancer DNS: $ALB_DNS"
    echo "You can access your application at: http://$ALB_DNS"
    
    if [ ! -z "$DOMAIN_NAME" ]; then
      echo "Once DNS propagates, you can also access it at: https://$DOMAIN_NAME"
    fi
  fi
  
  echo "==================="
  echo "To clean up all resources, run: ./aws-lamp-stack/cleanup_aws.sh"
else
  echo "Deployment failed. Check logs/aws_deployment.log for details."
fi
