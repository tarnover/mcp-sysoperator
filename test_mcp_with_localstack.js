// Test MCP Ansible Server with LocalStack
// This script demonstrates how to use the MCP Ansible server with LocalStack

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { runAwsOperation } = require('./localstack_aws_operations.js');

// Helper function to execute shell commands
function runCommand(command) {
  console.log(`Executing: ${command}`);
  try {
    const output = execSync(command, { encoding: 'utf8' });
    console.log(output);
    return output;
  } catch (error) {
    console.error(`Error executing command: ${error.message}`);
    console.error(error.stderr);
    throw error;
  }
}

// Create a temporary directory for our test files
function createTempDir() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-localstack-'));
  console.log(`Created temporary directory: ${tempDir}`);
  return tempDir;
}

// Create a playbook that uses awslocal instead of aws
function createLocalStackPlaybook(tempDir) {
  const playbookContent = `---
# Example Ansible playbook for LocalStack
- name: LocalStack AWS Operations
  hosts: localhost
  connection: local
  gather_facts: false
  tasks:
    - name: List S3 buckets using awslocal
      shell: awslocal s3 ls
      register: s3_buckets
      
    - name: Display S3 buckets
      debug:
        var: s3_buckets.stdout_lines
        
    - name: Create a new S3 bucket
      shell: awslocal s3 mb s3://mcp-test-bucket
      register: create_bucket
      ignore_errors: yes
      
    - name: Display bucket creation result
      debug:
        var: create_bucket
        
    - name: Upload a file to the bucket
      shell: echo "Hello from MCP Ansible" > /tmp/mcp-test.txt && awslocal s3 cp /tmp/mcp-test.txt s3://mcp-test-bucket/test.txt
      register: upload_file
      
    - name: Display upload result
      debug:
        var: upload_file
        
    - name: List objects in the bucket
      shell: awslocal s3 ls s3://mcp-test-bucket
      register: list_objects
      
    - name: Display objects
      debug:
        var: list_objects.stdout_lines
        
    - name: Create EC2 instance
      shell: awslocal ec2 run-instances --image-id ami-12345678 --instance-type t2.micro --count 1
      register: ec2_instance
      
    - name: Display EC2 instance
      debug:
        var: ec2_instance.stdout
        
    - name: List EC2 instances
      shell: awslocal ec2 describe-instances
      register: ec2_instances
      
    - name: Display EC2 instances
      debug:
        var: ec2_instances.stdout
`;

  const playbookPath = path.join(tempDir, 'mcp_localstack_playbook.yml');
  fs.writeFileSync(playbookPath, playbookContent);
  console.log(`Created playbook at: ${playbookPath}`);
  return playbookPath;
}

// Create a simple inventory file
function createInventory(tempDir) {
  const inventoryContent = `[local]
localhost ansible_connection=local
`;

  const inventoryPath = path.join(tempDir, 'inventory.ini');
  fs.writeFileSync(inventoryPath, inventoryContent);
  console.log(`Created inventory at: ${inventoryPath}`);
  return inventoryPath;
}

// Test the MCP Ansible server with LocalStack
async function testMcpWithLocalStack() {
  try {
    // Check if LocalStack is running
    console.log("Checking if LocalStack is running...");
    runCommand('awslocal s3 ls');
    console.log("LocalStack is running!");
    
    // Create temporary directory, playbook, and inventory
    const tempDir = createTempDir();
    const playbookPath = createLocalStackPlaybook(tempDir);
    const inventoryPath = createInventory(tempDir);
    
    // Test direct AWS operations with LocalStack
    console.log("\nTesting direct AWS operations with LocalStack...");
    
    // List S3 buckets
    console.log("\nListing S3 buckets:");
    const buckets = runAwsOperation('s3', 'list_buckets');
    console.log(buckets);
    
    // Create a bucket
    console.log("\nCreating S3 bucket:");
    try {
      const createBucket = runAwsOperation('s3', 'create_bucket', { bucket: 'mcp-direct-test-bucket' });
      console.log(createBucket);
    } catch (error) {
      console.log("Bucket may already exist, continuing...");
    }
    
    // Test MCP Ansible server with run_playbook
    console.log("\nTesting MCP Ansible server with run_playbook...");
    console.log("This would normally use the MCP tool:");
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
    
    // Since we can't directly use the MCP tool in this script,
    // we'll run the playbook using ansible-playbook directly
    console.log("\nRunning playbook with ansible-playbook...");
    runCommand(`ansible-playbook ${playbookPath} -i ${inventoryPath}`);
    
    // Test MCP Ansible server with run_ad_hoc
    console.log("\nTesting MCP Ansible server with run_ad_hoc...");
    console.log("This would normally use the MCP tool:");
    console.log(`
<use_mcp_tool>
<server_name>ansible</server_name>
<tool_name>run_ad_hoc</tool_name>
<arguments>
{
  "pattern": "localhost",
  "module": "shell",
  "args": "awslocal s3 ls"
}
</arguments>
</use_mcp_tool>
`);
    
    // Since we can't directly use the MCP tool in this script,
    // we'll run the ad-hoc command using ansible directly
    console.log("\nRunning ad-hoc command with ansible...");
    runCommand(`ansible localhost -i ${inventoryPath} -m shell -a "awslocal s3 ls"`);
    
    // Clean up
    console.log("\nCleaning up...");
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log(`Removed temporary directory: ${tempDir}`);
    
    console.log("\nTest completed successfully!");
    console.log("\nTo use these tests with the MCP Ansible server, you would:");
    console.log("1. Modify src/ansible-mcp-server/common/utils.ts to use awslocal instead of aws");
    console.log("2. Rebuild the server with npm run build");
    console.log("3. Use the MCP tools as shown in the examples above");
  } catch (error) {
    console.error("Test failed:", error);
  }
}

// Run the test
testMcpWithLocalStack();
