#!/usr/bin/env node

// Test script for MCP Ansible server with LocalStack
// This script demonstrates how to use the MCP Ansible server with LocalStack

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

// Get current file directory (equivalent to __dirname in CommonJS)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to execute shell commands
function runCommand(command) {
  console.log(`Executing: ${command}`);
  try {
    const output = execSync(command, { encoding: 'utf8' });
    console.log(output);
    return output;
  } catch (error) {
    console.error(`Error executing command: ${error.message}`);
    if (error.stderr) console.error(error.stderr);
    throw error;
  }
}

// Check if LocalStack is running
function checkLocalStackRunning() {
  try {
    runCommand('awslocal s3 ls');
    console.log("LocalStack is running!");
    return true;
  } catch (error) {
    console.error("LocalStack is not running. Please start LocalStack with 'localstack start'.");
    return false;
  }
}

// Test MCP integration
async function testMcpIntegration() {
  try {
    // Check if LocalStack is running
    console.log("Checking if LocalStack is running...");
    if (!checkLocalStackRunning()) {
      return;
    }
    
    // Get paths to playbook and inventory
    const playbookPath = path.join(__dirname, 'sample_playbook.yml');
    const inventoryPath = path.join(__dirname, 'inventory.ini');
    
    // Verify files exist
    if (!fs.existsSync(playbookPath)) {
      console.error(`Playbook not found: ${playbookPath}`);
      return;
    }
    
    if (!fs.existsSync(inventoryPath)) {
      console.error(`Inventory not found: ${inventoryPath}`);
      return;
    }
    
    // Display MCP tool usage example
    console.log("\nTo use the MCP Ansible server with LocalStack, you would use:");
    console.log(`
<use_mcp_tool>
<server_name>ansible</server_name>
<tool_name>run_playbook</tool_name>
<arguments>
{
  "playbook": "${playbookPath}",
  "inventory": "${inventoryPath}"
}
</arguments>
</use_mcp_tool>
`);
    
    // Display AWS S3 example
    console.log("\nTo list S3 buckets with the MCP Ansible server and LocalStack, you would use:");
    console.log(`
<use_mcp_tool>
<server_name>ansible</server_name>
<tool_name>aws_s3</tool_name>
<arguments>
{
  "action": "list_buckets",
  "region": "us-east-1"
}
</arguments>
</use_mcp_tool>
`);
    
    // Display AWS EC2 example
    console.log("\nTo list EC2 instances with the MCP Ansible server and LocalStack, you would use:");
    console.log(`
<use_mcp_tool>
<server_name>ansible</server_name>
<tool_name>aws_ec2</tool_name>
<arguments>
{
  "action": "list",
  "region": "us-east-1"
}
</arguments>
</use_mcp_tool>
`);
    
    // Display AWS CloudFormation example
    console.log("\nTo create a CloudFormation stack with the MCP Ansible server and LocalStack, you would use:");
    console.log(`
<use_mcp_tool>
<server_name>ansible</server_name>
<tool_name>aws_cloudformation</tool_name>
<arguments>
{
  "action": "create",
  "region": "us-east-1",
  "stackName": "test-stack",
  "templateBody": "{\\"Resources\\":{\\"MyBucket\\":{\\"Type\\":\\"AWS::S3::Bucket\\",\\"Properties\\":{\\"BucketName\\":\\"cf-created-bucket\\"}}}}"
}
</arguments>
</use_mcp_tool>
`);
    
    console.log("\nTo use these examples with the MCP Ansible server, you need to:");
    console.log("1. Modify src/ansible-mcp-server/common/utils.ts to use awslocal instead of aws");
    console.log("2. Rebuild the server with npm run build");
    console.log("3. Configure the MCP server in your MCP settings file");
    console.log("4. Use the MCP tools as shown in the examples above");
    
    console.log("\nFor now, we'll run the sample playbook directly with ansible-playbook:");
    runCommand(`ansible-playbook ${playbookPath} -i ${inventoryPath}`);
    
    console.log("\nTest completed successfully!");
  } catch (error) {
    console.error("Test failed:", error);
  }
}

// Run the test
testMcpIntegration();
