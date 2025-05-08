#!/bin/bash
# Script to test the LAMP stack deployment with LocalStack

# Set environment variables
export ENVIRONMENT=localstack
export AWS_REGION=us-east-1
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test

# Check if LocalStack is running
if ! curl -s http://localhost:4566/_localstack/health | grep -q "running"; then
  echo "LocalStack is not running. Please start LocalStack first."
  echo "You can start LocalStack with: docker run --rm -it -p 4566:4566 -p 4571:4571 localstack/localstack"
  exit 1
fi

# Create a directory for logs
mkdir -p logs

# Run the main playbook
echo "Running LAMP stack deployment with LocalStack..."
ansible-playbook playbooks/main.yml -v | tee logs/deployment.log

# Check the result
if [ ${PIPESTATUS[0]} -eq 0 ]; then
  echo "Deployment completed successfully!"
  
  # Display the resources created
  echo "Resources created:"
  echo "==================="
  
  # VPC
  echo "VPC:"
  aws --endpoint-url=http://localhost:4566 ec2 describe-vpcs --query "Vpcs[?Tags[?Key=='Name' && Value=='*lamp*']].{VpcId:VpcId,CidrBlock:CidrBlock,Name:Tags[?Key=='Name'].Value|[0]}" --output table
  
  # Subnets
  echo "Subnets:"
  aws --endpoint-url=http://localhost:4566 ec2 describe-subnets --query "Subnets[?Tags[?Key=='Name' && Value=='*lamp*']].{SubnetId:SubnetId,CidrBlock:CidrBlock,AvailabilityZone:AvailabilityZone,Name:Tags[?Key=='Name'].Value|[0]}" --output table
  
  # Security Groups
  echo "Security Groups:"
  aws --endpoint-url=http://localhost:4566 ec2 describe-security-groups --query "SecurityGroups[?GroupName!='default' && Tags[?Key=='Name' && Value=='*lamp*']].{GroupId:GroupId,GroupName:GroupName,Description:Description,Name:Tags[?Key=='Name'].Value|[0]}" --output table
  
  # EC2 Instances
  echo "EC2 Instances:"
  aws --endpoint-url=http://localhost:4566 ec2 describe-instances --query "Reservations[].Instances[?Tags[?Key=='Name' && Value=='*lamp*']].{InstanceId:InstanceId,InstanceType:InstanceType,State:State.Name,PrivateIp:PrivateIpAddress,Name:Tags[?Key=='Name'].Value|[0]}" --output table
  
  # RDS
  echo "RDS Clusters:"
  aws --endpoint-url=http://localhost:4566 rds describe-db-clusters --query "DBClusters[?DBClusterIdentifier=='*lamp*'].{ClusterId:DBClusterIdentifier,Engine:Engine,Status:Status,Endpoint:Endpoint}" --output table
  
  # EFS
  echo "EFS File Systems:"
  aws --endpoint-url=http://localhost:4566 efs describe-file-systems --query "FileSystems[?Tags[?Key=='Name' && Value=='*lamp*']].{FileSystemId:FileSystemId,LifeCycleState:LifeCycleState,Name:Tags[?Key=='Name'].Value|[0]}" --output table
  
  # Load Balancers
  echo "Load Balancers:"
  aws --endpoint-url=http://localhost:4566 elbv2 describe-load-balancers --query "LoadBalancers[?LoadBalancerName=='*lamp*'].{LoadBalancerName:LoadBalancerName,DNSName:DNSName,State:State.Code,Type:Type}" --output table
  
  echo "==================="
  echo "You can now test the deployment by accessing the load balancer DNS name."
  echo "Note: In LocalStack, the DNS name is not resolvable, but you can test the API endpoints directly."
  
  # Run a cleanup if requested
  read -p "Do you want to clean up the resources? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Cleaning up resources..."
    ansible-playbook playbooks/cleanup.yml -v | tee logs/cleanup.log
    
    if [ ${PIPESTATUS[0]} -eq 0 ]; then
      echo "Cleanup completed successfully!"
    else
      echo "Cleanup failed. Check logs/cleanup.log for details."
    fi
  fi
else
  echo "Deployment failed. Check logs/deployment.log for details."
fi
