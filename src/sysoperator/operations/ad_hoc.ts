import { AnsibleExecutionError } from '../common/errors.js';
import { RunAdHocOptions } from '../common/types.js';
import { runCommand, validateInventoryPath } from '../common/utils.js';

/**
 * Runs an Ansible ad-hoc command
 * @param options Options for running the ad-hoc command
 * @returns Standard output from ansible command
 * @throws AnsibleInventoryNotFoundError if the specified inventory doesn't exist
 * @throws AnsibleExecutionError if the command execution fails
 */
export async function runAdHoc(options: RunAdHocOptions): Promise<string> {
  const inventoryPath = validateInventoryPath(options.inventory);
  
  const args = [options.pattern, '-m', options.module];

  if (options.args) {
    args.push('-a', options.args);
  }

  if (inventoryPath) {
    args.push('-i', inventoryPath);
  }

  if (options.become) {
    args.push('--become');
  }

  if (options.extra_vars && Object.keys(options.extra_vars).length > 0) {
    args.push('--extra-vars', JSON.stringify(options.extra_vars));
  }

  try {
    const { stdout, stderr } = await runCommand('ansible', args);
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
