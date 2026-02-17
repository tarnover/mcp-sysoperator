import { AnsibleExecutionError } from '../common/errors.js';
import { 
  runCommand,
  createTempDirectory, 
  writeTempFile, 
  cleanupTempDirectory,
  verifyTerraformInstalled,
  verifyTflocalInstalled
} from '../common/utils.js';
import { TerraformOptions } from '../common/types.js';

// Export schema for use in index.ts
export { TerraformSchema } from '../common/types.js';

/**
 * Helper function to format command-line parameters from a map of key-value pairs
 * @param params Record containing parameters
 * @param prefix The prefix to add before each parameter (e.g., -var, -var-file)
 * @returns Formatted parameter string
 */
function appendCommandParams(args: string[], params: Record<string, any> | undefined, prefix: string): void {
  if (!params || Object.keys(params).length === 0) {
    return;
  }

  Object.entries(params).forEach(([key, value]) => {
    const serialized = typeof value === 'object' ? JSON.stringify(value) : String(value);
    args.push(prefix, `${key}=${serialized}`);
  });
}

/**
 * Execute Terraform commands
 * @param options Terraform options
 * @returns Result of Terraform operation
 */
export async function terraformOperations(options: TerraformOptions): Promise<string> {
  const { 
    action, 
    workingDir, 
    varFiles, 
    vars, 
    useLocalstack, 
    autoApprove, 
    backendConfig, 
    state,
    target,
    lockTimeout,
    refresh,
    workspace
  } = options;
  
  // Determine if we should use terraform or tflocal command
  const terraformCmd = useLocalstack ? 'tflocal' : 'terraform';

  // If using tflocal, verify it's installed
  if (useLocalstack) {
    await verifyTflocalInstalled();
  } else {
    // Otherwise, verify terraform is installed
    await verifyTerraformInstalled();
  }

  const commandArgs: string[] = [action];

  if (varFiles && varFiles.length > 0) {
    varFiles.forEach((file) => commandArgs.push(`-var-file=${file}`));
  }

  appendCommandParams(commandArgs, vars, '-var');
  appendCommandParams(commandArgs, backendConfig, '-backend-config');

  // Add specific parameters based on action
  switch (action) {
    case 'init':
      // No special options needed here
      break;
      
    case 'apply':
    case 'destroy':
      // Add auto-approve if specified
      if (autoApprove) {
        commandArgs.push('-auto-approve');
      }
      
      // Add refresh option
      if (refresh !== undefined) {
        commandArgs.push(`-refresh=${refresh ? 'true' : 'false'}`);
      }
      
      // Add state file if specified
      if (state) {
        commandArgs.push(`-state=${state}`);
      }
      
      // Add targets if specified
      if (target && target.length > 0) {
        target.forEach((t) => commandArgs.push(`-target=${t}`));
      }
      
      // Add lock timeout if specified
      if (lockTimeout) {
        commandArgs.push(`-lock-timeout=${lockTimeout}`);
      }
      break;
      
    case 'plan':
      // Add refresh option
      if (refresh !== undefined) {
        commandArgs.push(`-refresh=${refresh ? 'true' : 'false'}`);
      }
      
      // Add state file if specified
      if (state) {
        commandArgs.push(`-state=${state}`);
      }
      
      // Add targets if specified
      if (target && target.length > 0) {
        target.forEach((t) => commandArgs.push(`-target=${t}`));
      }
      
      // Add lock timeout if specified
      if (lockTimeout) {
        commandArgs.push(`-lock-timeout=${lockTimeout}`);
      }
      break;
      
    case 'workspace':
      // Add workspace name if specified
      if (workspace) {
        commandArgs.push('select', workspace);
      } else {
        commandArgs.push('list'); // Default to listing workspaces if no name is provided
      }
      break;
      
    // For other actions (validate, output, import), no special handling needed
  }

  // For debug purposes
  console.log('Executing Terraform command:', terraformCmd, commandArgs.join(' '));

  try {
    // Execute the command
    const { stdout, stderr } = await runCommand(terraformCmd, commandArgs, { cwd: workingDir });
    
    // Adjust output based on action
    switch (action) {
      case 'output':
        // Try to parse JSON output
        try {
          const outputJson = JSON.parse(stdout);
          return JSON.stringify(outputJson, null, 2);
        } catch (error) {
          // If not JSON, return as is
          return stdout;
        }
        
      default:
        return stdout || `Terraform ${action} completed successfully (no output).`;
    }
  } catch (error: any) {
    const errorMessage = error.stderr || error.message || 'Unknown error';
    throw new AnsibleExecutionError(`Terraform execution failed for ${action}: ${errorMessage}`, error.stderr);
  }
}

/**
 * Execute Terraform with a temporary tfvars file
 * @param options Terraform options
 * @param tfvarsContent Content for a temporary .tfvars file
 * @returns Result of Terraform operation
 */
export async function terraformWithTfvars(options: TerraformOptions, tfvarsContent: string): Promise<string> {
  let tempDir: string | undefined;
  
  try {
    // Create a temp directory for the tfvars file
    tempDir = await createTempDirectory('terraform-tfvars');
    
    // Write tfvars content to a file
    const tfvarsPath = await writeTempFile(tempDir, 'terraform.tfvars', tfvarsContent);
    
    // Add this file to varFiles array
    const varFiles = options.varFiles ? [...options.varFiles, tfvarsPath] : [tfvarsPath];
    
    // Call terraformOperations with updated options
    return await terraformOperations({
      ...options,
      varFiles
    });
  } finally {
    // Cleanup temp directory
    if (tempDir) {
      await cleanupTempDirectory(tempDir);
    }
  }
}
