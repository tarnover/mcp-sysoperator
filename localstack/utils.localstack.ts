// Modified utils.ts for LocalStack integration
// This file contains modified functions from src/ansible-mcp-server/common/utils.ts
// to use LocalStack instead of real AWS

import { existsSync } from 'fs';
import { mkdtemp, writeFile, rm } from 'fs/promises';
import { resolve, join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { tmpdir } from 'os';
import { 
  AnsiblePlaybookNotFoundError, 
  AnsibleInventoryNotFoundError, 
  AnsibleNotInstalledError,
  AwsCliNotInstalledError,
  AwsCredentialsError
} from '../src/ansible-mcp-server/common/errors.js';

export const execAsync = promisify(exec);

/**
 * Validates a playbook path and returns the absolute path
 * @param path Playbook path (can be relative)
 * @returns Absolute path to the playbook
 * @throws AnsiblePlaybookNotFoundError if the playbook doesn't exist
 */
export function validatePlaybookPath(path: string): string {
  // Resolve relative paths to absolute
  const absolutePath = resolve(path);
  if (!existsSync(absolutePath)) {
    throw new AnsiblePlaybookNotFoundError(path);
  }
  return absolutePath;
}

/**
 * Validates an inventory path and returns the absolute path
 * @param path Inventory path (can be relative)
 * @returns Absolute path to the inventory or undefined if no path provided
 * @throws AnsibleInventoryNotFoundError if the inventory doesn't exist
 */
export function validateInventoryPath(path?: string): string | undefined {
  if (!path) return undefined;
  
  // Resolve relative paths to absolute
  const absolutePath = resolve(path);
  if (!existsSync(absolutePath)) {
    throw new AnsibleInventoryNotFoundError(path);
  }
  return absolutePath;
}

/**
 * Checks if Ansible is installed on the system
 * @returns Promise that resolves to true if Ansible is installed, false otherwise
 */
export async function checkAnsibleInstalled(): Promise<boolean> {
  try {
    await execAsync('ansible --version');
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Creates a unique temporary directory.
 * @param prefix A prefix for the temporary directory name.
 * @returns Promise resolving to the path of the created temporary directory.
 */
export async function createTempDirectory(prefix: string): Promise<string> {
  const tempDirPrefix = join(tmpdir(), `${prefix}-`);
  try {
    const tempDirPath = await mkdtemp(tempDirPrefix);
    return tempDirPath;
  } catch (error: any) {
    throw new Error(`Failed to create temporary directory: ${error.message}`);
  }
}

/**
 * Writes content to a file within a specified temporary directory.
 * @param tempDir The temporary directory path.
 * @param filename The name of the file to create.
 * @param content The content to write to the file.
 * @returns Promise resolving to the full path of the written file.
 */
export async function writeTempFile(tempDir: string, filename: string, content: string): Promise<string> {
  const filePath = join(tempDir, filename);
  try {
    await writeFile(filePath, content, 'utf-8');
    return filePath;
  } catch (error: any) {
    throw new Error(`Failed to write temporary file ${filePath}: ${error.message}`);
  }
}

/**
 * Removes a temporary directory and all its contents.
 * @param tempDir The path of the temporary directory to remove.
 */
export async function cleanupTempDirectory(tempDir: string): Promise<void> {
  try {
    await rm(tempDir, { recursive: true, force: true });
  } catch (error: any) {
    // Log cleanup errors but don't throw, as the main operation might have succeeded
    console.error(`Failed to clean up temporary directory ${tempDir}: ${error.message}`);
  }
}

/**
 * Verifies that Ansible is installed and throws an error if it's not
 * @throws AnsibleNotInstalledError if Ansible is not installed
 */
export async function verifyAnsibleInstalled(): Promise<void> {
  const isInstalled = await checkAnsibleInstalled();
  if (!isInstalled) {
    throw new AnsibleNotInstalledError();
  }
}

/**
 * Checks if LocalStack AWS CLI is installed on the system
 * @returns Promise that resolves to true if LocalStack AWS CLI is installed, false otherwise
 */
export async function checkAwsCliInstalled(): Promise<boolean> {
  try {
    // Modified to use awslocal instead of aws
    await execAsync('awslocal --version');
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Verifies that LocalStack AWS CLI is installed and throws an error if it's not
 * @throws AwsCliNotInstalledError if LocalStack AWS CLI is not installed
 */
export async function verifyAwsCliInstalled(): Promise<void> {
  const isInstalled = await checkAwsCliInstalled();
  if (!isInstalled) {
    throw new AwsCliNotInstalledError();
  }
}

/**
 * Checks if LocalStack is running and accessible
 * @returns Promise that resolves to true if LocalStack is running, false otherwise
 */
export async function checkAwsCredentials(): Promise<boolean> {
  try {
    // Modified to use awslocal instead of aws
    await execAsync('awslocal sts get-caller-identity');
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Verifies that LocalStack is running and accessible
 * @throws AwsCredentialsError if LocalStack is not running or accessible
 */
export async function verifyAwsCredentials(): Promise<void> {
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
}
