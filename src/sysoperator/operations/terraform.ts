import { AnsibleExecutionError } from '../common/errors.js';
import { 
  execAsync, 
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
function formatCommandParams(params: Record<string, any> | undefined, prefix: string): string {
  if (!params || Object.keys(params).length === 0) {
    return '';
  }
  
  return Object.entries(params)
    .map(([key, value]) => {
      if (typeof value === 'string') {
        // For string values, wrap in quotes
        return `${prefix} ${key}="${value}"`;
      } else if (typeof value === 'object') {
        // For objects/arrays, convert to JSON and wrap in quotes
        return `${prefix} ${key}='${JSON.stringify(value)}'`;
      } else {
        // For numbers, booleans, etc.
        return `${prefix} ${key}=${value}`;
      }
    })
    .join(' ');
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

  // Base command with terraform/tflocal and action
  let command = `cd "${workingDir}" && ${terraformCmd} ${action}`;

  // Add var files if specified
  if (varFiles && varFiles.length > 0) {
    command += ' ' + varFiles.map(file => `-var-file="${file}"`).join(' ');
  }

  // Add vars if specified
  if (vars && Object.keys(vars).length > 0) {
    command += ' ' + formatCommandParams(vars, '-var');
  }

  // Add backend config if specified
  if (backendConfig && Object.keys(backendConfig).length > 0) {
    command += ' ' + formatCommandParams(backendConfig, '-backend-config');
  }

  // Add specific parameters based on action
  switch (action) {
    case 'init':
      // No special options needed here
      break;
      
    case 'apply':
    case 'destroy':
      // Add auto-approve if specified
      if (autoApprove) {
        command += ' -auto-approve';
      }
      
      // Add refresh option
      if (refresh !== undefined) {
        command += ` -refresh=${refresh ? 'true' : 'false'}`;
      }
      
      // Add state file if specified
      if (state) {
        command += ` -state="${state}"`;
      }
      
      // Add targets if specified
      if (target && target.length > 0) {
        command += ' ' + target.map(t => `-target="${t}"`).join(' ');
      }
      
      // Add lock timeout if specified
      if (lockTimeout) {
        command += ` -lock-timeout=${lockTimeout}`;
      }
      break;
      
    case 'plan':
      // Add refresh option
      if (refresh !== undefined) {
        command += ` -refresh=${refresh ? 'true' : 'false'}`;
      }
      
      // Add state file if specified
      if (state) {
        command += ` -state="${state}"`;
      }
      
      // Add targets if specified
      if (target && target.length > 0) {
        command += ' ' + target.map(t => `-target="${t}"`).join(' ');
      }
      
      // Add lock timeout if specified
      if (lockTimeout) {
        command += ` -lock-timeout=${lockTimeout}`;
      }
      break;
      
    case 'workspace':
      // Add workspace name if specified
      if (workspace) {
        command += ` select ${workspace}`;
      } else {
        command += ' list'; // Default to listing workspaces if no name is provided
      }
      break;
      
    // For other actions (validate, output, import), no special handling needed
  }

  // For debug purposes
  console.log(`Executing Terraform command: ${command}`);

  try {
    // Execute the command
    const { stdout, stderr } = await execAsync(command);
    
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
