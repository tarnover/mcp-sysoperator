import { AnsibleExecutionError } from '../common/errors.js';
import { VaultEncryptStringOptions, VaultDecryptStringOptions } from '../common/types.js';
import { execAsync } from '../common/utils.js';

/**
 * Encrypts a string using Ansible Vault
 * @param options Options for encryption
 * @returns Encrypted string
 * @throws AnsibleExecutionError if encryption fails
 */
export async function encryptString(options: VaultEncryptStringOptions): Promise<string> {
  // Build command
  let command = 'ansible-vault encrypt_string';
  
  // Add vault ID if specified
  if (options.vault_id) {
    command += ` --vault-id=${options.vault_id}`;
  }
  
  // Add vault password file if specified
  if (options.vault_password_file) {
    command += ` --vault-password-file=${options.vault_password_file}`;
  }
  
  // Add name if specified
  if (options.name) {
    command += ` --name=${options.name}`;
  }
  
  // Add the string to encrypt, using echo to avoid shell injection
  command = `echo -n '${options.string.replace(/'/g, "'\\''")}' | ${command}`;

  try {
    // Execute command
    const { stdout, stderr } = await execAsync(command);
    return stdout.trim();
  } catch (error) {
    // Handle exec error
    const execError = error as { stderr?: string; message: string };
    throw new AnsibleExecutionError(
      `Error encrypting string: ${execError.message}`,
      execError.stderr
    );
  }
}

/**
 * Decrypts a string using Ansible Vault
 * @param options Options for decryption
 * @returns Decrypted string
 * @throws AnsibleExecutionError if decryption fails
 */
export async function decryptString(options: VaultDecryptStringOptions): Promise<string> {
  // Create a temporary file with the encrypted string
  const tempFile = `/tmp/ansible-vault-decrypt-${Date.now()}.txt`;
  
  // Build command to create the temp file
  let createFileCommand = `echo '${options.string.replace(/'/g, "'\\''")}' > ${tempFile}`;
  
  // Build decrypt command
  let decryptCommand = `ansible-vault decrypt`;
  
  // Add vault ID if specified
  if (options.vault_id) {
    decryptCommand += ` --vault-id=${options.vault_id}`;
  }
  
  // Add vault password file if specified
  if (options.vault_password_file) {
    decryptCommand += ` --vault-password-file=${options.vault_password_file}`;
  }
  
  // Add output option and target file
  decryptCommand += ` --output=- ${tempFile}`;
  
  // Combine commands to cleanup temp file afterward
  const fullCommand = `${createFileCommand} && ${decryptCommand} && rm ${tempFile}`;

  try {
    // Execute command
    const { stdout, stderr } = await execAsync(fullCommand);
    return stdout.trim();
  } catch (error) {
    // Attempt to clean up the temp file even if the command failed
    try {
      await execAsync(`rm -f ${tempFile}`);
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    
    // Handle exec error
    const execError = error as { stderr?: string; message: string };
    throw new AnsibleExecutionError(
      `Error decrypting string: ${execError.message}`,
      execError.stderr
    );
  }
}
