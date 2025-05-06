# Using Ansible MCP Server with AWS

This guide demonstrates how to use the Ansible MCP server with AWS. The examples provided show various AWS operations that can be performed using Ansible.

## Prerequisites

1. AWS CLI installed and configured with valid credentials
2. Ansible installed
3. Ansible MCP server installed and configured
4. Required Ansible collections for AWS:
   ```
   ansible-galaxy collection install amazon.aws
   ansible-galaxy collection install community.aws
   ```

## Example Files

This repository includes several example files for working with AWS:

1. **aws_example.yml**: A comprehensive playbook demonstrating various AWS operations including EC2, S3, RDS, VPC, Route53, and Lambda.
2. **aws_inventory.yml**: A dynamic inventory configuration for AWS EC2 instances.
3. **cloudformation_example.yml**: A playbook for managing AWS CloudFormation stacks.
4. **cloudformation_template.json**: A CloudFormation template for creating a simple EC2 instance.

## Using the MCP Server with AWS

The Ansible MCP server provides several tools for working with AWS:

### 1. aws_ec2: Manage AWS EC2 instances

```
<use_mcp_tool>
<server_name>ansible</server_name>
<tool_name>aws_ec2</tool_name>
<arguments>
{
  "action": "list",
  "region": "us-west-2"
}
</arguments>
</use_mcp_tool>
```

### 2. aws_s3: Manage AWS S3 buckets and objects

```
<use_mcp_tool>
<server_name>ansible</server_name>
<tool_name>aws_s3</tool_name>
<arguments>
{
  "action": "list_buckets",
  "region": "us-west-2"
}
</arguments>
</use_mcp_tool>
```

### 3. aws_vpc: Manage AWS VPC networks

```
<use_mcp_tool>
<server_name>ansible</server_name>
<tool_name>aws_vpc</tool_name>
<arguments>
{
  "action": "list",
  "region": "us-west-2"
}
</arguments>
</use_mcp_tool>
```

### 4. aws_cloudformation: Manage AWS CloudFormation stacks

```
<use_mcp_tool>
<server_name>ansible</server_name>
<tool_name>aws_cloudformation</tool_name>
<arguments>
{
  "action": "list",
  "region": "us-west-2"
}
</arguments>
</use_mcp_tool>
```

### 5. aws_dynamic_inventory: Create AWS dynamic inventory

```
<use_mcp_tool>
<server_name>ansible</server_name>
<tool_name>aws_dynamic_inventory</tool_name>
<arguments>
{
  "region": "us-west-2",
  "keyed_groups": [
    {
      "prefix": "tag",
      "key": "tags.Name"
    },
    {
      "prefix": "instance_type",
      "key": "instance_type"
    }
  ],
  "hostnames": [
    "tag:Name",
    "public_ip_address",
    "private_ip_address",
    "instance_id"
  ]
}
</arguments>
</use_mcp_tool>
```

## Running the Example Playbooks

You can run the example playbooks using the Ansible MCP server:

```
<use_mcp_tool>
<server_name>ansible</server_name>
<tool_name>run_playbook</tool_name>
<arguments>
{
  "playbook": "/path/to/aws_example.yml",
  "tags": "info"
}
</arguments>
</use_mcp_tool>
```

## Using Dynamic Inventory

To use the AWS dynamic inventory with the Ansible MCP server:

1. Ensure the `aws_inventory.yml` file is properly configured
2. Use it with the `run_playbook` tool:

```
<use_mcp_tool>
<server_name>ansible</server_name>
<tool_name>run_playbook</tool_name>
<arguments>
{
  "playbook": "/path/to/your/playbook.yml",
  "inventory": "/path/to/aws_inventory.yml"
}
</arguments>
</use_mcp_tool>
```

## Notes

- These examples require valid AWS credentials to run
- Be cautious when running examples that create AWS resources, as they may incur costs
- Always clean up resources after testing to avoid unnecessary charges
