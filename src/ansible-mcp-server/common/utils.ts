import { existsSync } from 'fs';
import { resolve } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { 
  AnsiblePlaybookNotFoundError, 
  AnsibleInventoryNotFoundError, 
  AnsibleNotInstalledError,
  AwsCliNotInstalledError,
  AwsCredentialsError
} from './errors.js';

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
 * Checks if AWS CLI is installed on the system
 * @returns Promise that resolves to true if AWS CLI is installed, false otherwise
 */
export async function checkAwsCliInstalled(): Promise<boolean> {
  try {
    await execAsync('aws --version');
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Verifies that AWS CLI is installed and throws an error if it's not
 * @throws AwsCliNotInstalledError if AWS CLI is not installed
 */
export async function verifyAwsCliInstalled(): Promise<void> {
  const isInstalled = await checkAwsCliInstalled();
  if (!isInstalled) {
    throw new AwsCliNotInstalledError();
  }
}

/**
 * Checks if AWS credentials are configured properly
 * @returns Promise that resolves to true if AWS credentials are configured, false otherwise
 */
export async function checkAwsCredentials(): Promise<boolean> {
  try {
    await execAsync('aws sts get-caller-identity');
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Verifies that AWS credentials are configured properly and throws an error if they're not
 * @throws AwsCredentialsError if AWS credentials are not configured
 */
export async function verifyAwsCredentials(): Promise<void> {
  // First verify AWS CLI is installed
  await verifyAwsCliInstalled();
  
  // Then check credentials
  const isConfigured = await checkAwsCredentials();
  if (!isConfigured) {
    throw new AwsCredentialsError();
  }
}
