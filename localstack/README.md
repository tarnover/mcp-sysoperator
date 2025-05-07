# LocalStack Integration for MCP SysOperator Server

This directory contains scripts and utilities for integrating the MCP SysOperator server with LocalStack, allowing you to test AWS operations locally without real AWS credentials.

## Overview

LocalStack is a cloud service emulator that runs in a single container on your laptop or in your CI environment. It allows you to run AWS applications or Lambda functions without connecting to a remote AWS cloud.

This integration enables you to:

1. Test IaC that use AWS services locally
2. Develop and test AWS operations without incurring AWS costs
3. Run tests without requiring real AWS credentials
4. Validate your infrastructure code before deploying to real AWS

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- Ansible installed and in PATH
- LocalStack installed and running
- awslocal CLI installed

### Installing LocalStack

```bash
# Install LocalStack
pip install localstack

# Install awslocal CLI
pip install awscli-local

# Start LocalStack
localstack start
```

## Files

- **localstack_test.mjs**: Basic test script for running Ansible playbooks with LocalStack
- **localstack_aws_operations.mjs**: Utility library for AWS operations using LocalStack
- **test_mcp_with_localstack.mjs**: Comprehensive test script for MCP Ansible server with LocalStack
- **mcp_localstack_patch.js**: Documentation for modifying the MCP Ansible server to use LocalStack

## Usage

### Running the Test Scripts

```bash
# Run the basic test script
node localstack/localstack_test.mjs

# Run the AWS operations utility
node localstack/localstack_aws_operations.mjs

# Run the comprehensive test script
node localstack/test_mcp_with_localstack.mjs
```

### Modifying the MCP SysOperator Server for LocalStack

To modify the MCP Ansible server to use LocalStack instead of real AWS:

1. Edit `src/ansible-mcp-server/common/utils.ts`:
   - Replace `aws --version` with `awslocal --version` in `checkAwsCliInstalled()`
   - Replace `aws sts get-caller-identity` with `awslocal sts get-caller-identity` in `checkAwsCredentials()`

2. Rebuild the server:
   ```bash
   npm run build
   ```

## Creating Ansible Playbooks for LocalStack

When creating Ansible playbooks for LocalStack, use shell commands with `awslocal` instead of AWS modules:

```yaml
- name: List S3 buckets
  shell: awslocal s3 ls
  register: s3_buckets

- name: Display buckets
  debug:
    var: s3_buckets.stdout_lines
```

## Supported AWS Services

The following AWS services have been tested with this integration:

- S3: Create buckets, upload files, list objects
- CloudFormation: Create stacks, deploy templates
- EC2: List instances (creating instances requires AMI setup in LocalStack)

## Implementation Strategy

For a complete integration of the MCP SysOperator server with LocalStack:

1. Create a fork of the MCP SysOperator server repository
2. Modify the utils.ts file to use awslocal instead of aws
3. Modify the aws.ts file to use shell commands with awslocal instead of AWS modules
4. Add a flag or environment variable to toggle between real AWS and LocalStack
5. Rebuild the server and test with LocalStack

This approach allows you to use the MCP SysOperator server with LocalStack for testing without affecting the ability to use it with real AWS when needed.
