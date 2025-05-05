import { AnsibleExecutionError } from '../common/errors.js';
import { RunAdHocOptions } from '../common/types.js';
import { execAsync, validateInventoryPath } from '../common/utils.js';

/**
 * Runs an Ansible ad-hoc command
 * @param options Options for running the ad-hoc command
 * @returns Standard output from ansible command
 * @throws AnsibleInventoryNotFoundError if the specified inventory doesn't exist
 * @throws AnsibleExecutionError if the command execution fails
 */
export async function runAdHoc(options: RunAdHocOptions): Promise<string> {
  const inventoryPath = validateInventoryPath(options.inventory);
  
  // Build command
  let command = `ansible ${options.pattern}`;
  
  // Add module
  command += ` -m ${options.module}`;
  
  // Add module args if specified
  if (options.args) {
    command += ` -a "${options.args}"`;
  }
  
  // Add inventory if specified
  if (inventoryPath) {
    command += ` -i ${inventoryPath}`;
  }
  
  // Add become flag if needed
  if (options.become) {
    command += ' --become';
  }
  
  // Add extra vars if specified
  if (options.extra_vars && Object.keys(options.extra_vars).length > 0) {
    const extraVarsJson = JSON.stringify(options.extra_vars);
    command += ` --extra-vars '${extraVarsJson}'`;
  }

  try {
    // Execute command
    const { stdout, stderr } = await execAsync(command);
    return stdout || 'Command executed successfully (no output)';
  } catch (error) {
    // Handle exec error
    const execError = error as { stderr?: string; message: string };
    throw new AnsibleExecutionError(
      `Error running ad-hoc command: ${execError.message}`,
      execError.stderr
    );
  }
}
