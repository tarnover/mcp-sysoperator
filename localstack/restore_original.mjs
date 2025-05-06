#!/usr/bin/env node

// Script to restore the original MCP Ansible server files after patching for LocalStack
// This script restores the original utils.ts and aws.ts files from their backups

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

// Restore the utils.ts file
function restoreUtilsFile() {
  const utilsPath = path.join(rootDir, 'src', 'ansible-mcp-server', 'common', 'utils.ts');
  const backupPath = `${utilsPath}.bak`;
  
  if (!fs.existsSync(backupPath)) {
    console.error(`Backup file not found: ${backupPath}`);
    return false;
  }
  
  // Restore the original file
  fs.copyFileSync(backupPath, utilsPath);
  console.log(`Restored original utils.ts from ${backupPath}`);
  
  // Remove the backup file
  fs.unlinkSync(backupPath);
  console.log(`Removed backup file: ${backupPath}`);
  
  return true;
}

// Restore the aws.ts file
function restoreAwsFile() {
  const awsPath = path.join(rootDir, 'src', 'ansible-mcp-server', 'operations', 'aws.ts');
  const backupPath = `${awsPath}.bak`;
  
  if (!fs.existsSync(backupPath)) {
    console.error(`Backup file not found: ${backupPath}`);
    return false;
  }
  
  // Restore the original file
  fs.copyFileSync(backupPath, awsPath);
  console.log(`Restored original aws.ts from ${backupPath}`);
  
  // Remove the backup file
  fs.unlinkSync(backupPath);
  console.log(`Removed backup file: ${backupPath}`);
  
  return true;
}

// Remove the config file
function removeConfigFile() {
  const configPath = path.join(rootDir, 'src', 'ansible-mcp-server', 'config', 'localstack.js');
  
  if (!fs.existsSync(configPath)) {
    console.error(`Config file not found: ${configPath}`);
    return false;
  }
  
  // Remove the config file
  fs.unlinkSync(configPath);
  console.log(`Removed config file: ${configPath}`);
  
  return true;
}

// Restore the original MCP Ansible server files
async function restoreOriginalFiles() {
  try {
    console.log("Restoring original MCP Ansible server files...");
    
    // Restore the utils.ts file
    const utilsRestored = restoreUtilsFile();
    if (!utilsRestored) {
      console.error("Failed to restore utils.ts");
      return;
    }
    
    // Restore the aws.ts file
    const awsRestored = restoreAwsFile();
    if (!awsRestored) {
      console.error("Failed to restore aws.ts");
      return;
    }
    
    // Remove the config file
    const configRemoved = removeConfigFile();
    if (!configRemoved) {
      console.error("Failed to remove config file");
      return;
    }
    
    console.log("\nBuilding the MCP Ansible server...");
    runCommand('npm run build');
    
    console.log("\nMCP Ansible server has been restored to use real AWS!");
    console.log("You can now use the MCP Ansible server with real AWS.");
  } catch (error) {
    console.error("Failed to restore original files:", error);
  }
}

// Run the restore script
restoreOriginalFiles();
