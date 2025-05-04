import { existsSync } from 'fs';
import { resolve } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { AnsiblePlaybookNotFoundError, AnsibleInventoryNotFoundError, AnsibleNotInstalledError } from './errors.js';

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
