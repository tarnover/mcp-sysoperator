#!/usr/bin/env node

// Script to run the sample playbook with LocalStack
// This script demonstrates how to run Ansible playbooks with LocalStack

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

// Run the sample playbook
async function runSamplePlaybook() {
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
    
    // Run the playbook
    console.log("\nRunning sample playbook with ansible-playbook...");
    runCommand(`ansible-playbook ${playbookPath} -i ${inventoryPath}`);
    
    console.log("\nPlaybook execution completed successfully!");
    console.log("\nThis demonstrates how to use Ansible with LocalStack for testing AWS operations locally.");
    console.log("You can use this approach to test your AWS playbooks before running them against real AWS infrastructure.");
  } catch (error) {
    console.error("Failed to run sample playbook:", error);
  }
}

// Run the sample playbook
runSamplePlaybook();
