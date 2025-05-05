import { spawn } from 'child_process';
import { AnsibleExecutionError } from '../common/errors.js';
import { VaultEncryptStringOptions, VaultDecryptStringOptions } from '../common/types.js';
import { execAsync, createTempDirectory, writeTempFile, cleanupTempDirectory } from '../common/utils.js';

/**
 * Encrypts a string using Ansible Vault
 * @param options Options for encryption
 * @returns Encrypted string
 * @throws AnsibleExecutionError if encryption fails
 */
export async function encryptString(options: VaultEncryptStringOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = ['encrypt_string'];
    
    // Add vault ID if specified
    if (options.vault_id) {
      args.push(`--vault-id=${options.vault_id}`);
    }
    
    // Add vault password file if specified
    if (options.vault_password_file) {
      args.push(`--vault-password-file=${options.vault_password_file}`);
    }
    
    // Add name if specified
    if (options.name) {
      args.push(`--name=${options.name}`);
    }
    
    // Add --stdin flag to read from stdin
    args.push('--stdin');

    console.error(`Executing: ansible-vault ${args.join(' ')} (with string piped to stdin)`);
    const vaultProcess = spawn('ansible-vault', args, { stdio: ['pipe', 'pipe', 'pipe'] });

    let stdoutData = '';
    let stderrData = '';

    vaultProcess.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    vaultProcess.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    vaultProcess.on('close', (code) => {
      if (code === 0) {
        resolve(stdoutData.trim());
      } else {
        const errorMessage = stderrData || `ansible-vault exited with code ${code}`;
        reject(new AnsibleExecutionError(`Error encrypting string: ${errorMessage}`, stderrData));
      }
    });

    vaultProcess.on('error', (err) => {
      reject(new AnsibleExecutionError(`Failed to start ansible-vault: ${err.message}`));
    });

    // Write the string to encrypt to stdin
    vaultProcess.stdin.write(options.string);
    vaultProcess.stdin.end();
  });
}

/**
 * Decrypts a string using Ansible Vault
 * @param options Options for decryption
 * @returns Decrypted string
 * @throws AnsibleExecutionError if decryption fails
 */
export async function decryptString(options: VaultDecryptStringOptions): Promise<string> {
  let tempDir: string | undefined;
  try {
    // Create a unique temporary directory
    tempDir = await createTempDirectory('ansible-vault-decrypt');
    
    // Write the encrypted string to a temporary file
    const tempFilePath = await writeTempFile(tempDir, 'encrypted.txt', options.string);

    // Build the decrypt command arguments
    const args = ['decrypt', tempFilePath, '--output=-']; // Output to stdout

    // Add vault ID if specified
    if (options.vault_id) {
      args.splice(1, 0, `--vault-id=${options.vault_id}`); // Insert after 'decrypt'
    }
    
    // Add vault password file if specified
    if (options.vault_password_file) {
      args.splice(1, 0, `--vault-password-file=${options.vault_password_file}`); // Insert after 'decrypt'
    }

    const command = `ansible-vault ${args.join(' ')}`;
    console.error(`Executing: ${command}`);

    // Execute the command asynchronously
    const { stdout, stderr } = await execAsync(command);
    return stdout.trim();

  } catch (error: any) {
    // Handle execution errors
    const errorMessage = error.stderr || error.message || 'Unknown error';
    throw new AnsibleExecutionError(`Error decrypting string: ${errorMessage}`, error.stderr);
  } finally {
    // Ensure cleanup happens even if errors occur
    if (tempDir) {
      await cleanupTempDirectory(tempDir);
    }
  }
}
