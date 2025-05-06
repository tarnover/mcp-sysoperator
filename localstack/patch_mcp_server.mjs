#!/usr/bin/env node

// Script to patch the MCP Ansible server to use LocalStack
// This script modifies the utils.ts and aws.ts files to use LocalStack instead of real AWS

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

// Get current file directory (equivalent to __dirname in CommonJS)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

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

// Patch the utils.ts file
function patchUtilsFile() {
  const utilsPath = path.join(rootDir, 'src', 'ansible-mcp-server', 'common', 'utils.ts');
  const localstackUtilsPath = path.join(__dirname, 'utils.localstack.ts');
  
  if (!fs.existsSync(utilsPath)) {
    console.error(`Utils file not found: ${utilsPath}`);
    return false;
  }
  
  if (!fs.existsSync(localstackUtilsPath)) {
    console.error(`LocalStack utils file not found: ${localstackUtilsPath}`);
    return false;
  }
  
  // Backup the original file
  const backupPath = `${utilsPath}.bak`;
  fs.copyFileSync(utilsPath, backupPath);
  console.log(`Backed up original utils.ts to ${backupPath}`);
  
  // Read the original file
  const originalContent = fs.readFileSync(utilsPath, 'utf8');
  
  // Read the LocalStack utils file
  const localstackContent = fs.readFileSync(localstackUtilsPath, 'utf8');
  
  // Modify the checkAwsCliInstalled function
  let modifiedContent = originalContent.replace(
    /export async function checkAwsCliInstalled\(\): Promise<boolean> {[\s\S]*?}/,
    `export async function checkAwsCliInstalled(): Promise<boolean> {
  try {
    // Modified to use awslocal instead of aws
    await execAsync('awslocal --version');
    return true;
  } catch (error) {
    return false;
  }
}`
  );
  
  // Modify the checkAwsCredentials function
  modifiedContent = modifiedContent.replace(
    /export async function checkAwsCredentials\(\): Promise<boolean> {[\s\S]*?}/,
    `export async function checkAwsCredentials(): Promise<boolean> {
  try {
    // Modified to use awslocal instead of aws
    await execAsync('awslocal sts get-caller-identity');
    return true;
  } catch (error) {
    return false;
  }
}`
  );
  
  // Add the checkLocalStackRunning function
  if (!modifiedContent.includes('checkLocalStackRunning')) {
    modifiedContent = modifiedContent.replace(
      /export async function verifyAwsCredentials\(\): Promise<void> {[\s\S]*?}/,
      `export async function verifyAwsCredentials(): Promise<void> {
  // First verify LocalStack AWS CLI is installed
  await verifyAwsCliInstalled();
  
  // Then check if LocalStack is running
  const isRunning = await checkAwsCredentials();
  if (!isRunning) {
    throw new AwsCredentialsError();
  }
}

/**
 * Checks if LocalStack is running
 * @returns Promise that resolves to true if LocalStack is running, false otherwise
 */
export async function checkLocalStackRunning(): Promise<boolean> {
  try {
    await execAsync('awslocal s3 ls');
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Verifies that LocalStack is running and throws an error if it's not
 * @throws Error if LocalStack is not running
 */
export async function verifyLocalStackRunning(): Promise<void> {
  const isRunning = await checkLocalStackRunning();
  if (!isRunning) {
    throw new Error('LocalStack is not running. Please start LocalStack with "localstack start".');
  }
}`
    );
  }
  
  // Write the modified content back to the file
  fs.writeFileSync(utilsPath, modifiedContent);
  console.log(`Patched utils.ts to use LocalStack`);
  
  return true;
}

// Patch the aws.ts file
function patchAwsFile() {
  const awsPath = path.join(rootDir, 'src', 'ansible-mcp-server', 'operations', 'aws.ts');
  const localstackAwsPath = path.join(__dirname, 'aws.localstack.ts');
  
  if (!fs.existsSync(awsPath)) {
    console.error(`AWS file not found: ${awsPath}`);
    return false;
  }
  
  if (!fs.existsSync(localstackAwsPath)) {
    console.error(`LocalStack AWS file not found: ${localstackAwsPath}`);
    return false;
  }
  
  // Backup the original file
  const backupPath = `${awsPath}.bak`;
  fs.copyFileSync(awsPath, backupPath);
  console.log(`Backed up original aws.ts to ${backupPath}`);
  
  // Read the original file
  const originalContent = fs.readFileSync(awsPath, 'utf8');
  
  // Read the LocalStack AWS file
  const localstackContent = fs.readFileSync(localstackAwsPath, 'utf8');
  
  // Replace all instances of 'aws ' with 'awslocal '
  let modifiedContent = originalContent.replace(/aws /g, 'awslocal ');
  
  // Replace all instances of 'aws\n' with 'awslocal\n'
  modifiedContent = modifiedContent.replace(/aws\n/g, 'awslocal\n');
  
  // Replace all instances of 'aws"' with 'awslocal"'
  modifiedContent = modifiedContent.replace(/aws"/g, 'awslocal"');
  
  // Replace all instances of "aws'" with "awslocal'"
  modifiedContent = modifiedContent.replace(/aws'/g, 'awslocal\'');
  
  // Write the modified content back to the file
  fs.writeFileSync(awsPath, modifiedContent);
  console.log(`Patched aws.ts to use LocalStack`);
  
  return true;
}

// Create a config file to enable/disable LocalStack
function createConfigFile() {
  const configDir = path.join(rootDir, 'src', 'ansible-mcp-server', 'config');
  const configPath = path.join(configDir, 'localstack.js');
  
  // Create the config directory if it doesn't exist
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  // Copy the config file
  fs.copyFileSync(path.join(__dirname, 'config.js'), configPath);
  console.log(`Created config file at ${configPath}`);
  
  return true;
}

// Patch the MCP Ansible server to use LocalStack
async function patchMcpServer() {
  try {
    // Check if LocalStack is running
    console.log("Checking if LocalStack is running...");
    if (!checkLocalStackRunning()) {
      console.log("Please start LocalStack and try again.");
      return;
    }
    
    console.log("\nPatching MCP Ansible server to use LocalStack...");
    
    // Patch the utils.ts file
    const utilsPatched = patchUtilsFile();
    if (!utilsPatched) {
      console.error("Failed to patch utils.ts");
      return;
    }
    
    // Patch the aws.ts file
    const awsPatched = patchAwsFile();
    if (!awsPatched) {
      console.error("Failed to patch aws.ts");
      return;
    }
    
    // Create the config file
    const configCreated = createConfigFile();
    if (!configCreated) {
      console.error("Failed to create config file");
      return;
    }
    
    console.log("\nBuilding the MCP Ansible server...");
    runCommand('npm run build');
    
    console.log("\nMCP Ansible server has been patched to use LocalStack!");
    console.log("You can now use the MCP Ansible server with LocalStack.");
    console.log("\nTo test the integration, run:");
    console.log("node localstack/test_mcp_integration.mjs");
    
    console.log("\nTo restore the original files, run:");
    console.log("mv src/ansible-mcp-server/common/utils.ts.bak src/ansible-mcp-server/common/utils.ts");
    console.log("mv src/ansible-mcp-server/operations/aws.ts.bak src/ansible-mcp-server/operations/aws.ts");
    console.log("rm src/ansible-mcp-server/config/localstack.js");
    console.log("npm run build");
  } catch (error) {
    console.error("Failed to patch MCP Ansible server:", error);
  }
}

// Run the patch script
patchMcpServer();
