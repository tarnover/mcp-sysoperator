# LocalStack Compatibility

This document outlines the compatibility of the AWS LAMP Stack infrastructure with LocalStack for local testing purposes.

## Overview

[LocalStack](https://localstack.cloud/) is a cloud service emulator that runs in a single container on your laptop or in your CI environment. It provides an easy-to-use test/mocking framework for developing cloud applications.

This project uses LocalStack to test the AWS infrastructure locally before deploying to the actual AWS cloud, saving time and costs during development.

## Supported AWS Services

The following AWS services used in this project are supported by LocalStack:

| AWS Service | LocalStack Support | Notes |
|-------------|-------------------|-------|
| EC2 | ✅ Partial | Basic instance operations supported |
| VPC | ✅ Partial | Basic networking supported |
| RDS | ✅ Partial | Basic database operations supported |
| EFS | ✅ Partial | Basic file system operations supported |
| ALB/ELB | ✅ Partial | Basic load balancer operations supported |
| Route53 | ✅ Partial | Basic DNS operations supported |
| IAM | ✅ Yes | Most IAM operations supported |
| CloudWatch | ✅ Partial | Basic monitoring supported |
| CloudTrail | ✅ Partial | Basic logging supported |
| WAF | ✅ Partial | Basic web application firewall supported |
| Auto Scaling | ✅ Partial | Basic auto scaling supported |

## Limitations

When testing with LocalStack, be aware of the following limitations:

1. **EC2 Instances**: LocalStack doesn't actually run EC2 instances. It simulates the API but doesn't provide actual compute resources.

2. **RDS Databases**: LocalStack simulates RDS APIs but uses a local database engine instead of the actual AWS RDS service.

3. **EFS**: File system operations are simulated but don't provide actual distributed file system capabilities.

4. **Networking**: While VPC, subnets, and security groups can be created, actual network isolation isn't enforced.

5. **Load Balancing**: ALB/ELB APIs are simulated but don't actually distribute traffic.

6. **Auto Scaling**: The API is simulated but doesn't actually scale resources.

7. **WAF**: Rules can be created but aren't actually enforced.

## Testing Strategy

Given these limitations, our testing strategy with LocalStack focuses on:

1. **Infrastructure Provisioning**: Verifying that Terraform can create all required resources without errors.

2. **Configuration Management**: Testing that Ansible playbooks run correctly against local resources.

3. **API Interactions**: Ensuring that our scripts correctly interact with AWS APIs.

4. **Resource Dependencies**: Verifying that resource dependencies are correctly defined.

## LocalStack Configuration

The `test_with_localstack.sh` script configures LocalStack with the necessary services and endpoints. It sets up:

1. A local provider configuration for Terraform that points to LocalStack endpoints.
2. Environment variables for AWS credentials and region.
3. A local inventory for Ansible that simulates the AWS resources.

## Running Tests

To run tests with LocalStack:

1. Start LocalStack:
   ```bash
   localstack start
   ```

2. Run the test script:
   ```bash
   ./test_with_localstack.sh
   ```

The script will:
- Initialize Terraform with LocalStack provider configuration
- Apply the Terraform configuration to create simulated resources
- Run Ansible playbooks against the local environment
- Perform basic tests to verify the setup
- Clean up resources (optional)

## Pro Version Features

Some features used in this project may require LocalStack Pro, including:

- Advanced VPC networking
- Complex IAM policies
- WAF rule enforcement
- CloudTrail advanced logging

If you encounter limitations with the community version, consider upgrading to LocalStack Pro for more comprehensive testing.

## Troubleshooting

If you encounter issues with LocalStack testing:

1. Check LocalStack logs:
   ```bash
   localstack logs
   ```

2. Verify LocalStack is running and healthy:
   ```bash
   curl http://localhost:4566/_localstack/health
   ```

3. Ensure all required services are enabled in LocalStack.

4. Check that AWS credentials are set to the test values used by LocalStack.
