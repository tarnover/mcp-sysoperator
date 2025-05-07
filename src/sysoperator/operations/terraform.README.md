# Terraform Operations in MCP SysOperator

This module provides functionality to execute Terraform commands through the MCP SysOperator server. It supports both standard Terraform and tflocal (Terraform with LocalStack) for local cloud development and testing.

## Features

- Execute all common Terraform operations (init, plan, apply, destroy, etc.)
- Support for variable files and inline variables
- Backend configuration
- State file management
- Workspace management
- LocalStack integration via tflocal

## Requirements

- Terraform CLI installed and in PATH
- For LocalStack integration: tflocal installed and LocalStack running

## Usage

The Terraform operations are exposed through the `terraform` tool in the MCP SysOperator server. Here's how to use it:

### Basic Operations

```
<use_mcp_tool>
<server_name>ansible</server_name>
<tool_name>terraform</tool_name>
<arguments>
{
  "action": "init|plan|apply|destroy|validate|output|import|workspace",
  "workingDir": "/path/to/terraform/project"
}
</arguments>
</use_mcp_tool>
```

### Terraform with Variables

```
<use_mcp_tool>
<server_name>ansible</server_name>
<tool_name>terraform</tool_name>
<arguments>
{
  "action": "apply",
  "workingDir": "/path/to/terraform/project",
  "vars": {
    "instance_type": "t2.micro",
    "region": "us-west-2",
    "count": 3
  },
  "varFiles": [
    "/path/to/terraform.tfvars",
    "/path/to/environment.tfvars"
  ]
}
</arguments>
</use_mcp_tool>
```

### Terraform with LocalStack (tflocal)

```
<use_mcp_tool>
<server_name>ansible</server_name>
<tool_name>terraform</tool_name>
<arguments>
{
  "action": "apply",
  "workingDir": "/path/to/terraform/project",
  "useLocalstack": true,
  "autoApprove": true
}
</arguments>
</use_mcp_tool>
```

### Advanced Options

```
<use_mcp_tool>
<server_name>ansible</server_name>
<tool_name>terraform</tool_name>
<arguments>
{
  "action": "plan",
  "workingDir": "/path/to/terraform/project",
  "state": "custom.tfstate",
  "target": ["aws_instance.web", "aws_security_group.allow_http"],
  "lockTimeout": "30s",
  "refresh": false,
  "backendConfig": {
    "bucket": "my-terraform-state",
    "key": "prod/terraform.tfstate",
    "region": "us-west-2"
  }
}
</arguments>
</use_mcp_tool>
```

## Error Handling

The Terraform operations module provides detailed error messages when Terraform commands fail. These include the standard error output from Terraform, which can be useful for debugging issues.

## Implementation Details

The Terraform operations module is implemented in `terraform.ts` and works by:

1. Verifying Terraform or tflocal is installed
2. Constructing the appropriate command with all specified options
3. Executing the command in the specified working directory
4. Parsing and returning the output

Special handling is provided for certain commands like `output`, which attempts to parse the JSON output to provide structured data.

## Development Workflow

When using Terraform with LocalStack in a development workflow:

1. Start LocalStack: `localstack start`
2. Use the standard Terraform actions but set `useLocalstack: true`
3. tflocal will automatically redirect AWS API calls to LocalStack

This allows for rapid development and testing of Terraform configurations without incurring AWS costs or requiring real AWS credentials.
