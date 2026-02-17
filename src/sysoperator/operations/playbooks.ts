import { AnsibleExecutionError } from '../common/errors.js';
import { RunPlaybookOptions, CheckSyntaxOptions, ListTasksOptions } from '../common/types.js';
import { runCommand, validatePlaybookPath, validateInventoryPath } from '../common/utils.js';

/**
 * Runs an Ansible playbook
 * @param options Options for running the playbook
 * @returns Standard output from ansible-playbook command
 * @throws AnsiblePlaybookNotFoundError if the playbook doesn't exist
 * @throws AnsibleInventoryNotFoundError if the specified inventory doesn't exist
 * @throws AnsibleExecutionError if the playbook execution fails
 */
export async function runPlaybook(options: RunPlaybookOptions): Promise<string> {
  const playbookPath = validatePlaybookPath(options.playbook);
  const inventoryPath = validateInventoryPath(options.inventory);
  
  const args = [playbookPath];

  if (inventoryPath) {
    args.push('-i', inventoryPath);
  }

  if (options.extraVars && Object.keys(options.extraVars).length > 0) {
    args.push('--extra-vars', JSON.stringify(options.extraVars));
  }

  if (options.tags) {
    args.push('--tags', options.tags);
  }

  if (options.limit) {
    args.push('--limit', options.limit);
  }

  try {
    const { stdout, stderr } = await runCommand('ansible-playbook', args);
    return stdout || 'Playbook executed successfully (no output)';
  } catch (error) {
    // Handle exec error
    const execError = error as { stderr?: string; message: string };
    throw new AnsibleExecutionError(
      `Error running playbook: ${execError.message}`,
      execError.stderr
    );
  }
}

/**
 * Checks the syntax of an Ansible playbook without executing it
 * @param options Options containing the playbook path
 * @returns Standard output from ansible-playbook --syntax-check command
 * @throws AnsiblePlaybookNotFoundError if the playbook doesn't exist
 * @throws AnsibleExecutionError if the syntax check fails
 */
export async function checkSyntax(options: CheckSyntaxOptions): Promise<string> {
  const playbookPath = validatePlaybookPath(options.playbook);
  
  try {
    const { stdout, stderr } = await runCommand('ansible-playbook', [playbookPath, '--syntax-check']);
    return stdout || 'Syntax check passed (no issues found)';
  } catch (error) {
    // Handle exec error - in this case, a syntax error
    const execError = error as { stderr?: string; message: string };
    throw new AnsibleExecutionError(
      `Syntax error: ${execError.message}`,
      execError.stderr
    );
  }
}

/**
 * Lists all tasks that would be executed by a playbook
 * @param options Options containing the playbook path
 * @returns Standard output from ansible-playbook --list-tasks command
 * @throws AnsiblePlaybookNotFoundError if the playbook doesn't exist
 * @throws AnsibleExecutionError if the listing fails
 */
export async function listTasks(options: ListTasksOptions): Promise<string> {
  const playbookPath = validatePlaybookPath(options.playbook);
  
  try {
    const { stdout, stderr } = await runCommand('ansible-playbook', [playbookPath, '--list-tasks']);
    return stdout || 'No tasks found in playbook';
  } catch (error) {
    // Handle exec error
    const execError = error as { stderr?: string; message: string };
    throw new AnsibleExecutionError(
      `Error listing tasks: ${execError.message}`,
      execError.stderr
    );
  }
}
