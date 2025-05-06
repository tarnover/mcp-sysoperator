// LocalStack Test Script for MCP Ansible Server
// This script demonstrates how to use the MCP Ansible server with LocalStack

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

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
    console.error(error.stderr);
    throw error;
  }
}

// Create a temporary directory for our test files
function createTempDir() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ansible-localstack-'));
  console.log(`Created temporary directory: ${tempDir}`);
  return tempDir;
}

// Create a playbook that uses awslocal instead of aws
function createLocalStackPlaybook(tempDir) {
  const playbookContent = `---
# Example Ansible playbook for LocalStack
- name: LocalStack S3 Operations
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
      shell: awslocal s3 mb s3://ansible-test-bucket
      register: create_bucket
      ignore_errors: yes
      
    - name: Display bucket creation result
      debug:
        var: create_bucket
        
    - name: Upload a file to the bucket
      shell: echo "Hello from Ansible MCP" > /tmp/test.txt && awslocal s3 cp /tmp/test.txt s3://ansible-test-bucket/test.txt
      register: upload_file
      
    - name: Display upload result
      debug:
        var: upload_file
        
    - name: List objects in the bucket
      shell: awslocal s3 ls s3://ansible-test-bucket
      register: list_objects
      
    - name: Display objects
      debug:
        var: list_objects.stdout_lines
`;

  const playbookPath = path.join(tempDir, 'localstack_playbook.yml');
  fs.writeFileSync(playbookPath, playbookContent);
  console.log(`Created playbook at: ${playbookPath}`);
  return playbookPath;
}

// Main function to run the test
async function runTest() {
  try {
    // Check if LocalStack is running
    console.log("Checking if LocalStack is running...");
    runCommand('awslocal s3 ls');
    console.log("LocalStack is running!");
    
    // Create temporary directory and playbook
    const tempDir = createTempDir();
    const playbookPath = createLocalStackPlaybook(tempDir);
    
    // Run the playbook using ansible-playbook directly
    console.log("\nRunning playbook with ansible-playbook...");
    runCommand(`ansible-playbook ${playbookPath}`);
    
    // Clean up
    console.log("\nCleaning up...");
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log(`Removed temporary directory: ${tempDir}`);
    
    console.log("\nTest completed successfully!");
  } catch (error) {
    console.error("Test failed:", error);
  }
}

// Run the test
runTest();
