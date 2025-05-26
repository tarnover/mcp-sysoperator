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

export class AwsCredentialsError extends AnsibleError {
  constructor(message = 'AWS credentials are not configured or are invalid') {
    super(message);
    this.name = 'AwsCredentialsError';
  }
}

export class AwsCliNotInstalledError extends AnsibleError {
  constructor() {
    super('AWS CLI is not installed or not found in PATH. Please install AWS CLI first.');
    this.name = 'AwsCliNotInstalledError';
  }
}

export class AwsModuleNotFoundError extends AnsibleError {
  constructor(moduleName: string) {
    super(`AWS module not found: ${moduleName}. Make sure amazon.aws collection is installed.`);
    this.name = 'AwsModuleNotFoundError';
  }
}

export class TerraformNotInstalledError extends AnsibleError {
  constructor() {
    super('Terraform is not installed or not found in PATH. Please install Terraform first.');
    this.name = 'TerraformNotInstalledError';
  }
}

export class TflocalNotInstalledError extends AnsibleError {
  constructor() {
    super('tflocal is not installed or not found in PATH. Please install tflocal first.');
    this.name = 'TflocalNotInstalledError';
  }
}

export function isAnsibleError(error: unknown): error is AnsibleError {
  return error instanceof AnsibleError;
}

export function formatAnsibleError(error: AnsibleError): string {
  if (error instanceof AnsibleExecutionError && error.stderr) {
    return `AnsibleExecutionError: ${error.message}\nDetails: ${error.stderr}`;
  }

  // For other errors, use their specific 'name' and 'message' properties
  // This avoids redundancy if error.message already contains a good description.
  const errorName = error.name; 

  switch (errorName) {
    case 'AnsiblePlaybookNotFoundError':
    case 'AnsibleInventoryNotFoundError':
    case 'AnsibleNotInstalledError':
    case 'AwsCredentialsError':
    case 'AwsCliNotInstalledError':
    case 'AwsModuleNotFoundError':
    case 'TerraformNotInstalledError':
    case 'TflocalNotInstalledError':
      return `${errorName}: ${error.message}`;
    case 'AnsibleError': // Generic base, if not caught by more specific types above
      return `AnsibleError: ${error.message}`;
    default:
      // Fallback for any other error that might somehow be passed in,
      // or if new AnsibleError subtypes are added without updating this function.
      return `Error: ${error.message}`;
  }
}
