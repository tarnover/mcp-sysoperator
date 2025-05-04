import { ErrorCode } from '@modelcontextprotocol/sdk/types.js';

export class AnsibleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AnsibleError';
  }
}

export class AnsibleExecutionError extends AnsibleError {
  readonly stderr?: string;
  
  constructor(message: string, stderr?: string) {
    super(message);
    this.name = 'AnsibleExecutionError';
    this.stderr = stderr;
  }
}

export class AnsiblePlaybookNotFoundError extends AnsibleError {
  constructor(path: string) {
    super(`Playbook not found: ${path}`);
    this.name = 'AnsiblePlaybookNotFoundError';
  }
}

export class AnsibleInventoryNotFoundError extends AnsibleError {
  constructor(path: string) {
    super(`Inventory not found: ${path}`);
    this.name = 'AnsibleInventoryNotFoundError';
  }
}

export class AnsibleNotInstalledError extends AnsibleError {
  constructor() {
    super('Ansible is not installed or not found in PATH. Please install Ansible first.');
    this.name = 'AnsibleNotInstalledError';
  }
}

export function isAnsibleError(error: unknown): error is AnsibleError {
  return error instanceof AnsibleError;
}

export function formatAnsibleError(error: AnsibleError): string {
  let message = `Ansible Error: ${error.message}`;
  
  if (error instanceof AnsibleExecutionError && error.stderr) {
    message = `Execution Error: ${error.message}\nDetails: ${error.stderr}`;
  } else if (error instanceof AnsiblePlaybookNotFoundError) {
    message = `Playbook Not Found: ${error.message}`;
  } else if (error instanceof AnsibleInventoryNotFoundError) {
    message = `Inventory Not Found: ${error.message}`;
  } else if (error instanceof AnsibleNotInstalledError) {
    message = `Ansible Not Installed: ${error.message}`;
  }

  return message;
}
