import { z } from 'zod';

// Terraform Actions
export const TerraformActionEnum = z.enum(['init', 'plan', 'apply', 'destroy', 'validate', 'output', 'import', 'workspace']);
export type TerraformAction = z.infer<typeof TerraformActionEnum>;

// AWS Actions
export const EC2InstanceActionEnum = z.enum(['list', 'create', 'terminate', 'start', 'stop']);
export type EC2InstanceAction = z.infer<typeof EC2InstanceActionEnum>;

export const S3ActionEnum = z.enum(['list_buckets', 'create_bucket', 'delete_bucket', 'list_objects', 'upload', 'download']);
export type S3Action = z.infer<typeof S3ActionEnum>;

export const VPCActionEnum = z.enum(['list', 'create', 'delete']);
export type VPCAction = z.infer<typeof VPCActionEnum>;

export const CloudFormationActionEnum = z.enum(['list', 'create', 'update', 'delete']);
export type CloudFormationAction = z.infer<typeof CloudFormationActionEnum>;

export const IAMActionEnum = z.enum(['list_roles', 'list_policies', 'create_role', 'create_policy', 'delete_role', 'delete_policy']);
export type IAMAction = z.infer<typeof IAMActionEnum>;

export const RDSActionEnum = z.enum(['list', 'create', 'delete', 'start', 'stop']);
export type RDSAction = z.infer<typeof RDSActionEnum>;

export const Route53ActionEnum = z.enum(['list_zones', 'list_records', 'create_zone', 'create_record', 'delete_record', 'delete_zone']);
export type Route53Action = z.infer<typeof Route53ActionEnum>;

export const ELBActionEnum = z.enum(['list', 'create', 'delete']);
export type ELBAction = z.infer<typeof ELBActionEnum>;

export const LambdaActionEnum = z.enum(['list', 'create', 'update', 'delete', 'invoke']);
export type LambdaAction = z.infer<typeof LambdaActionEnum>;

// AWS EC2 Schema
export const EC2InstanceSchema = z.object({
  action: EC2InstanceActionEnum,
  region: z.string().min(1, 'AWS region is required'),
  instanceIds: z.array(z.string()).optional(),
  filters: z.record(z.any()).optional(),
  instanceType: z.string().optional(),
  imageId: z.string().optional(),
  keyName: z.string().optional(),
  securityGroups: z.array(z.string()).optional(),
  userData: z.string().optional(),
  count: z.number().optional(),
  tags: z.record(z.string()).optional(),
  waitForCompletion: z.boolean().optional().default(true),
  terminationProtection: z.boolean().optional()
});

export type EC2InstanceOptions = z.infer<typeof EC2InstanceSchema>;

// AWS S3 Schema
export const S3Schema = z.object({
  action: S3ActionEnum,
  region: z.string().min(1, 'AWS region is required'),
  bucket: z.string().optional(),
  objectKey: z.string().optional(),
  localPath: z.string().optional(),
  acl: z.string().optional(),
  tags: z.record(z.string()).optional(),
  metadata: z.record(z.string()).optional(),
  contentType: z.string().optional()
});

export type S3Options = z.infer<typeof S3Schema>;

// AWS VPC Schema
export const VPCSchema = z.object({
  action: VPCActionEnum,
  region: z.string().min(1, 'AWS region is required'),
  vpcId: z.string().optional(),
  cidrBlock: z.string().optional(),
  name: z.string().optional(),
  dnsSupport: z.boolean().optional(),
  dnsHostnames: z.boolean().optional(),
  tags: z.record(z.string()).optional(),
  subnets: z.array(z.object({
    cidr: z.string(),
    az: z.string().optional(),
    tags: z.record(z.string()).optional()
  })).optional()
});

export type VPCOptions = z.infer<typeof VPCSchema>;

// AWS CloudFormation Schema
export const CloudFormationSchema = z.object({
  action: CloudFormationActionEnum,
  region: z.string().min(1, 'AWS region is required'),
  stackName: z.string().optional(),
  templateBody: z.string().optional(),
  templateUrl: z.string().optional(),
  parameters: z.record(z.any()).optional(),
  capabilities: z.array(z.string()).optional(),
  tags: z.record(z.string()).optional()
});

export type CloudFormationOptions = z.infer<typeof CloudFormationSchema>;

// AWS IAM Schema
export const IAMSchema = z.object({
  action: IAMActionEnum,
  region: z.string().min(1, 'AWS region is required'),
  name: z.string().optional(),
  roleName: z.string().optional(),
  policyName: z.string().optional(),
  policyDocument: z.any().optional(),
  assumeRolePolicyDocument: z.any().optional(),
  path: z.string().optional(),
  managedPolicies: z.array(z.string()).optional()
});

export type IAMOptions = z.infer<typeof IAMSchema>;

// AWS RDS Schema
export const RDSSchema = z.object({
  action: RDSActionEnum,
  region: z.string().min(1, 'AWS region is required'),
  dbInstanceIdentifier: z.string().optional(),
  dbEngine: z.string().optional(),
  dbInstanceClass: z.string().optional(),
  allocatedStorage: z.number().optional(),
  masterUsername: z.string().optional(),
  masterPassword: z.string().optional(),
  vpcSecurityGroupIds: z.array(z.string()).optional(),
  dbSubnetGroupName: z.string().optional(),
  tags: z.record(z.string()).optional(),
  multiAZ: z.boolean().optional(),
  backupRetentionPeriod: z.number().optional(),
  skipFinalSnapshot: z.boolean().optional() // Added based on usage in aws.ts
});

export type RDSOptions = z.infer<typeof RDSSchema>;

// AWS Route53 Schema
export const Route53Schema = z.object({
  action: Route53ActionEnum,
  region: z.string().min(1, 'AWS region is required'),
  zoneId: z.string().optional(),
  zoneName: z.string().optional(),
  recordName: z.string().optional(),
  recordType: z.string().optional(),
  recordTtl: z.number().optional(),
  recordValue: z.union([z.string(), z.array(z.string())]).optional(),
  recordState: z.string().optional(),
  comment: z.string().optional() // Added based on usage in aws.ts
});

export type Route53Options = z.infer<typeof Route53Schema>;

// AWS ELB Schema
export const ELBSchema = z.object({
  action: ELBActionEnum,
  region: z.string().min(1, 'AWS region is required'),
  name: z.string().optional(),
  lbType: z.enum(['classic', 'application', 'network']).optional().default('application'),
  scheme: z.string().optional(),
  subnets: z.array(z.string()).optional(),
  securityGroups: z.array(z.string()).optional(),
  listeners: z.array(z.any()).optional(), // Consider defining a more specific listener schema
  healthCheck: z.any().optional(), // Consider defining a more specific health check schema
  tags: z.record(z.string()).optional(),
  targetGroups: z.array(z.any()).optional() // Added based on usage in aws.ts. Consider a specific schema.
});

export type ELBOptions = z.infer<typeof ELBSchema>;

// AWS Lambda Schema
export const LambdaSchema = z.object({
  action: LambdaActionEnum,
  region: z.string().min(1, 'AWS region is required'),
  name: z.string().optional(),
  zipFile: z.string().optional(),
  s3Bucket: z.string().optional(),
  s3Key: z.string().optional(),
  functionCode: z.string().optional(),
  runtime: z.string().optional(),
  handler: z.string().optional(),
  role: z.string().optional(),
  description: z.string().optional(),
  timeout: z.number().optional(),
  memorySize: z.number().optional(),
  environment: z.record(z.string()).optional(),
  tags: z.record(z.string()).optional(),
  payload: z.any().optional() // Added based on usage in aws.ts. Payload structure varies.
});

export type LambdaOptions = z.infer<typeof LambdaSchema>;

// AWS Dynamic Inventory Schema
export const DynamicInventorySchema = z.object({
  region: z.string().min(1, 'AWS region is required'),
  filters: z.record(z.any()).optional(),
  // Changed hostnames to allow array of strings based on aws.ts usage
  hostnames: z.array(z.string()).optional(), 
  // Changed keyed_groups to match structure used in aws.ts
  keyed_groups: z.array(z.object({
    prefix: z.string(),
    key: z.string(),
    separator: z.string().optional()
  })).optional(),
  // Added compose based on usage in aws.ts
  compose: z.record(z.string()).optional() 
});

export type DynamicInventoryOptions = z.infer<typeof DynamicInventorySchema>;

// Schema for running ad-hoc commands
export const RunAdHocSchema = z.object({
  pattern: z.string().min(1, 'Host pattern is required'),
  module: z.string().default('shell'),
  args: z.string().optional(),
  inventory: z.string().optional(),
  become: z.boolean().optional(),
  extra_vars: z.record(z.any()).optional(),
});

export type RunAdHocOptions = z.infer<typeof RunAdHocSchema>;

// Schema for vault encryption/decryption
export const VaultEncryptStringSchema = z.object({
  string: z.string().min(1, 'String to encrypt is required'),
  vault_id: z.string().optional(),
  vault_password_file: z.string().optional(),
  name: z.string().optional(),
});

export type VaultEncryptStringOptions = z.infer<typeof VaultEncryptStringSchema>;

export const VaultDecryptStringSchema = z.object({
  string: z.string().min(1, 'Encrypted string is required'),
  vault_id: z.string().optional(),
  vault_password_file: z.string().optional(),
});

export type VaultDecryptStringOptions = z.infer<typeof VaultDecryptStringSchema>;

// Schema for running a playbook
export const RunPlaybookSchema = z.object({
  playbook: z.string().min(1, 'Playbook path is required'),
  extraVars: z.record(z.any()).optional(),
  inventory: z.string().optional(),
  tags: z.string().optional(),
  limit: z.string().optional(),
});

export type RunPlaybookOptions = z.infer<typeof RunPlaybookSchema>;

// Schema for listing inventory
export const ListInventorySchema = z.object({
  inventory: z.string().optional(),
});

export type ListInventoryOptions = z.infer<typeof ListInventorySchema>;

// Schema for checking playbook syntax
export const CheckSyntaxSchema = z.object({
  playbook: z.string().min(1, 'Playbook path is required'),
});

export type CheckSyntaxOptions = z.infer<typeof CheckSyntaxSchema>;

// Schema for listing tasks in a playbook
export const ListTasksSchema = z.object({
  playbook: z.string().min(1, 'Playbook path is required'),
});

export type ListTasksOptions = z.infer<typeof ListTasksSchema>;

// Terraform Schema
export const TerraformSchema = z.object({
  action: TerraformActionEnum,
  workingDir: z.string().min(1, 'Working directory is required'),
  varFiles: z.array(z.string()).optional(),
  vars: z.record(z.any()).optional(),
  autoApprove: z.boolean().optional().default(false),
  useLocalstack: z.boolean().optional().default(false),
  backendConfig: z.record(z.string()).optional(),
  state: z.string().optional(),
  target: z.array(z.string()).optional(),
  lockTimeout: z.string().optional(),
  refresh: z.boolean().optional().default(true),
  workspace: z.string().optional()
});

export type TerraformOptions = z.infer<typeof TerraformSchema>;
