import { AnsibleExecutionError } from '../common/errors.js';
import { ListInventoryOptions } from '../common/types.js';
import { execAsync, validateInventoryPath } from '../common/utils.js';

/**
 * Lists all hosts and groups in an Ansible inventory
 * @param options Options containing the inventory path
 * @returns JSON string representation of the inventory (formatted)
 * @throws AnsibleInventoryNotFoundError if the specified inventory doesn't exist
 * @throws AnsibleExecutionError if the inventory listing fails
 */
export async function listInventory(options: ListInventoryOptions): Promise<string> {
  const inventoryPath = validateInventoryPath(options.inventory);
  
  // Build command
  let command = 'ansible-inventory';
  
  // Add inventory if specified
  if (inventoryPath) {
    command += ` -i ${inventoryPath}`;
  }
  
  command += ' --list';

  try {
    // Execute command
    const { stdout, stderr } = await execAsync(command);
    
    try {
      // Try to parse as JSON for better formatting
      const inventory = JSON.parse(stdout);
      return JSON.stringify(inventory, null, 2);
    } catch {
      // Fall back to raw output if can't parse as JSON
      return stdout || 'No inventory data returned';
    }
  } catch (error) {
    // Handle exec error
    const execError = error as { stderr?: string; message: string };
    throw new AnsibleExecutionError(
      `Error listing inventory: ${execError.message}`,
      execError.stderr
    );
  }
}

/**
 * Gets the default inventory content if it exists
 * @param defaultInventoryPath Path to the default inventory file
 * @returns Content of the default inventory file
 * @throws Error if the file cannot be read
 */
export function getDefaultInventoryContent(defaultInventoryPath: string): string {
  // This function would read the default inventory file content
  // Implementation would depend on how your server handles file reading
  // For now, we'll leave it as a placeholder
  return '';
}
