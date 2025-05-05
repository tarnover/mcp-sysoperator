import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, unlinkSync } from 'fs';
import { dirname } from 'path';
import { 
  EC2InstanceOptions, 
  S3Options, 
  VPCOptions, 
  CloudFormationOptions,
  IAMOptions,
  RDSOptions,
  Route53Options,
  ELBOptions,
  LambdaOptions,
  DynamicInventoryOptions,
  // Export schema definitions for use in index.ts
  EC2InstanceSchema,
  S3Schema,
  VPCSchema,
  CloudFormationSchema,
  IAMSchema,
  RDSSchema,
  Route53Schema,
  ELBSchema,
  LambdaSchema,
  DynamicInventorySchema
} from '../common/types.js';

// Re-export schemas for use in index.ts
export { 
  EC2InstanceSchema,
  S3Schema,
  VPCSchema, 
  CloudFormationSchema,
  IAMSchema,
  RDSSchema,
  Route53Schema,
  ELBSchema,
  LambdaSchema,
  DynamicInventorySchema
};
import { AnsibleError, AwsCredentialsError } from '../common/errors.js';
import { verifyAwsCredentials } from '../common/utils.js';

/**
 * Generate a temporary file path with timestamp to avoid collisions
 */
const getTempFilePath = (prefix: string, extension: string = 'yml'): string => {
  return `/tmp/${prefix}_${Date.now()}.${extension}`;
};

/**
 * Safely write content to a file, creating directories if needed
 */
const safeWriteFile = (path: string, content: string): void => {
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  } catch (error: any) {
    throw new AnsibleError(`Failed to write file ${path}: ${error.message}`);
  }
};

/**
 * Execute an Ansible playbook and return the result
 */
const executeAnsiblePlaybook = (playbookPath: string, extraParams: string = ''): string => {
  try {
    // Execute the playbook
    const command = `ansible-playbook ${playbookPath} ${extraParams}`;
    console.error(`Executing: ${command}`);
    const result = execSync(command, { encoding: 'utf8' });
    return result;
  } catch (error: any) {
    // Handle execution errors
    const errorMessage = error.stderr || error.message || 'Unknown error';
    throw new AnsibleError(`Ansible execution failed: ${errorMessage}`);
  } finally {
    // Cleanup - try to remove the temporary playbook file
    try {
      unlinkSync(playbookPath);
    } catch (cleanupError) {
      console.error(`Failed to clean up temporary file ${playbookPath}:`, cleanupError);
    }
  }
};

/**
 * Convert object to YAML-formatted string for Ansible playbook
 */
const formatYamlParams = (params: Record<string, any>, indentation: number = 6): string => {
  // Filter out undefined/null values and format each key-value pair
  return Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key, value]) => {
      const indent = ' '.repeat(indentation);
      
      // Format based on value type
      if (typeof value === 'string') {
        return `${indent}${key}: "${value}"`;
      } else if (Array.isArray(value)) {
        return `${indent}${key}: ${JSON.stringify(value)}`;
      } else if (typeof value === 'object') {
        return `${indent}${key}: ${JSON.stringify(value)}`;
      }
      return `${indent}${key}: ${value}`;
    })
    .join('\n');
};

/**
 * EC2 Instance Operations
 */
export async function ec2InstanceOperations(args: EC2InstanceOptions): Promise<string> {
  await verifyAwsCredentials();

  const { action, region, instanceIds, filters, instanceType, imageId, keyName, securityGroups, userData, count, tags, waitForCompletion, terminationProtection, ...restParams } = args;

  // Create temporary playbook file
  const playbookPath = getTempFilePath('aws_ec2');
  
  let playbookContent = `---
- name: AWS EC2 ${action} operation
  hosts: localhost
  connection: local
  gather_facts: no
  tasks:`;
  
  switch (action) {
    case 'list':
      playbookContent += `
    - name: List EC2 instances
      amazon.aws.ec2_instance_info:
        region: "${region}"
${filters ? formatYamlParams({ filters }) : ''}
      register: ec2_info
    
    - name: Display instances
      debug:
        var: ec2_info.instances`;
      break;
      
    case 'create':
      playbookContent += `
    - name: Create EC2 instance
      amazon.aws.ec2_instance:
        region: "${region}"
        state: present
        instance_type: "${instanceType}"
        image_id: "${imageId}"
${formatYamlParams({
  key_name: keyName,
  security_groups: securityGroups,
  user_data: userData,
  exact_count: count,
  tags: tags,
  wait: waitForCompletion,
  termination_protection: terminationProtection,
  ...restParams
})}
      register: ec2_create
    
    - name: Display created instance details
      debug:
        var: ec2_create`;
      break;
      
    case 'terminate':
      playbookContent += `
    - name: Terminate EC2 instances
      amazon.aws.ec2_instance:
        region: "${region}"
        instance_ids: ${JSON.stringify(instanceIds)}
        state: absent
        wait: ${waitForCompletion ? 'yes' : 'no'}
      register: ec2_terminate
      
    - name: Display termination result
      debug:
        var: ec2_terminate`;
      break;
      
    case 'start':
      playbookContent += `
    - name: Start EC2 instances
      amazon.aws.ec2_instance:
        region: "${region}"
        instance_ids: ${JSON.stringify(instanceIds)}
        state: running
        wait: ${waitForCompletion ? 'yes' : 'no'}
      register: ec2_start
      
    - name: Display start result
      debug:
        var: ec2_start`;
      break;
      
    case 'stop':
      playbookContent += `
    - name: Stop EC2 instances
      amazon.aws.ec2_instance:
        region: "${region}"
        instance_ids: ${JSON.stringify(instanceIds)}
        state: stopped
        wait: ${waitForCompletion ? 'yes' : 'no'}
      register: ec2_stop
      
    - name: Display stop result
      debug:
        var: ec2_stop`;
      break;
      
    default:
      throw new AnsibleError(`Unknown EC2 action: ${action}`);
  }
  
  // Write playbook to file
  safeWriteFile(playbookPath, playbookContent);
  
  // Execute the playbook
  return executeAnsiblePlaybook(playbookPath);
}

/**
 * S3 Operations
 */
export async function s3Operations(args: S3Options): Promise<string> {
  await verifyAwsCredentials();

  const { action, region, bucket, objectKey, localPath, acl, tags, metadata, contentType } = args;

  // Create temporary playbook file
  const playbookPath = getTempFilePath('aws_s3');
  
  let playbookContent = `---
- name: AWS S3 ${action} operation
  hosts: localhost
  connection: local
  gather_facts: no
  tasks:`;
  
  switch (action) {
    case 'list_buckets':
      playbookContent += `
    - name: List S3 buckets
      amazon.aws.s3_bucket_info:
        region: "${region}"
      register: s3_buckets
    
    - name: Display buckets
      debug:
        var: s3_buckets.buckets`;
      break;
      
    case 'create_bucket':
      playbookContent += `
    - name: Create S3 bucket
      amazon.aws.s3_bucket:
        region: "${region}"
        name: "${bucket}"
        state: present
${formatYamlParams({ tags, acl })}
      register: s3_create
      
    - name: Display creation result
      debug:
        var: s3_create`;
      break;
      
    case 'delete_bucket':
      playbookContent += `
    - name: Delete S3 bucket
      amazon.aws.s3_bucket:
        region: "${region}"
        name: "${bucket}"
        state: absent
        force: true
      register: s3_delete
      
    - name: Display deletion result
      debug:
        var: s3_delete`;
      break;
      
    case 'list_objects':
      playbookContent += `
    - name: List S3 objects
      amazon.aws.s3_object:
        region: "${region}"
        bucket: "${bucket}"
        mode: list
      register: s3_objects
    
    - name: Display objects
      debug:
        var: s3_objects.keys`;
      break;
      
    case 'upload':
      playbookContent += `
    - name: Upload file to S3
      amazon.aws.s3_object:
        region: "${region}"
        bucket: "${bucket}"
        object: "${objectKey}"
        src: "${localPath}"
        mode: put
${formatYamlParams({ acl, tags, metadata, content_type: contentType })}
      register: s3_upload
      
    - name: Display upload result
      debug:
        var: s3_upload`;
      break;
      
    case 'download':
      playbookContent += `
    - name: Download file from S3
      amazon.aws.s3_object:
        region: "${region}"
        bucket: "${bucket}"
        object: "${objectKey}"
        dest: "${localPath}"
        mode: get
      register: s3_download
      
    - name: Display download result
      debug:
        var: s3_download`;
      break;
      
    default:
      throw new AnsibleError(`Unknown S3 action: ${action}`);
  }
  
  // Write playbook to file
  safeWriteFile(playbookPath, playbookContent);
  
  // Execute the playbook
  return executeAnsiblePlaybook(playbookPath);
}

/**
 * VPC Operations
 */
export async function vpcOperations(args: VPCOptions): Promise<string> {
  await verifyAwsCredentials();

  const { action, region, vpcId, cidrBlock, name, dnsSupport, dnsHostnames, tags, subnets } = args;

  // Create temporary playbook file
  const playbookPath = getTempFilePath('aws_vpc');
  
  let playbookContent = `---
- name: AWS VPC ${action} operation
  hosts: localhost
  connection: local
  gather_facts: no
  tasks:`;
  
  switch (action) {
    case 'list':
      playbookContent += `
    - name: List VPCs
      amazon.aws.ec2_vpc_net_info:
        region: "${region}"
      register: vpc_info
    
    - name: Display VPCs
      debug:
        var: vpc_info.vpcs`;
      break;
      
    case 'create':
      playbookContent += `
    - name: Create VPC
      amazon.aws.ec2_vpc_net:
        region: "${region}"
        cidr_block: "${cidrBlock}"
        state: present
${formatYamlParams({
  name,
  dns_support: dnsSupport,
  dns_hostnames: dnsHostnames,
  tags
})}
      register: vpc_create
    
    - name: Display VPC details
      debug:
        var: vpc_create.vpc`;
      
      // If subnets are specified, add subnet creation task
      if (subnets && subnets.length > 0) {
        playbookContent += `
        
    - name: Create subnets
      amazon.aws.ec2_vpc_subnet:
        region: "${region}"
        vpc_id: "{{ vpc_create.vpc.id }}"
        cidr: "{{ item.cidr }}"
        az: "{{ item.az | default(omit) }}"
        tags: "{{ item.tags | default(omit) }}"
        state: present
      loop:
${subnets.map((subnet) => `        - ${JSON.stringify(subnet)}`).join('\n')}
      register: subnet_create
      
    - name: Display subnet details
      debug:
        var: subnet_create`;
      }
      break;
      
    case 'delete':
      playbookContent += `
    - name: Delete VPC
      amazon.aws.ec2_vpc_net:
        region: "${region}"
        vpc_id: "${vpcId}"
        state: absent
      register: vpc_delete
      
    - name: Display deletion result
      debug:
        var: vpc_delete`;
      break;
      
    default:
      throw new AnsibleError(`Unknown VPC action: ${action}`);
  }
  
  // Write playbook to file
  safeWriteFile(playbookPath, playbookContent);
  
  // Execute the playbook
  return executeAnsiblePlaybook(playbookPath);
}

/**
 * CloudFormation Operations
 */
export async function cloudFormationOperations(args: CloudFormationOptions): Promise<string> {
  await verifyAwsCredentials();

  const { action, region, stackName, templateBody, templateUrl, parameters, capabilities, tags } = args;

  // Create temporary playbook file
  const playbookPath = getTempFilePath('aws_cloudformation');
  const templatePath = templateBody ? getTempFilePath('aws_cfn_template') : undefined;
  
  // If template body is provided, write it to a file
  if (templateBody && templatePath) {
    safeWriteFile(templatePath, templateBody);
  }
  
  let playbookContent = `---
- name: AWS CloudFormation ${action} operation
  hosts: localhost
  connection: local
  gather_facts: no
  tasks:`;
  
  switch (action) {
    case 'list':
      playbookContent += `
    - name: List CloudFormation stacks
      amazon.aws.cloudformation_info:
        region: "${region}"
      register: cfn_info
    
    - name: Display stacks
      debug:
        var: cfn_info.stacks`;
      break;
      
    case 'create':
    case 'update':
      // Use either template file or URL
      const templateParam = templatePath 
        ? `template: "${templatePath}"` 
        : `template_url: "${templateUrl}"`;
      
      playbookContent += `
    - name: ${action === 'create' ? 'Create' : 'Update'} CloudFormation stack
      amazon.aws.cloudformation:
        region: "${region}"
        stack_name: "${stackName}"
        state: present
        ${templateParam}
${formatYamlParams({
  template_parameters: parameters,
  capabilities,
  tags
})}
      register: cfn_create
    
    - name: Display stack outputs
      debug:
        var: cfn_create.stack_outputs`;
      break;
      
    case 'delete':
      playbookContent += `
    - name: Delete CloudFormation stack
      amazon.aws.cloudformation:
        region: "${region}"
        stack_name: "${stackName}"
        state: absent
      register: cfn_delete
      
    - name: Display deletion result
      debug:
        var: cfn_delete`;
      break;
      
    default:
      throw new AnsibleError(`Unknown CloudFormation action: ${action}`);
  }
  
  // Write playbook to file
  safeWriteFile(playbookPath, playbookContent);
  
  // Execute the playbook
  const result = executeAnsiblePlaybook(playbookPath);
  
  // Clean up template file if it was created
  if (templatePath) {
    try {
      unlinkSync(templatePath);
    } catch (cleanupError) {
      console.error(`Failed to clean up temporary template file ${templatePath}:`, cleanupError);
    }
  }
  
  return result;
}

/**
 * IAM Operations
 */
export async function iamOperations(args: IAMOptions): Promise<string> {
  await verifyAwsCredentials();

  const { action, region, name, policyName, policyDocument, path, roleName, assumeRolePolicyDocument, managedPolicies } = args;

  // Create temporary playbook file
  const playbookPath = getTempFilePath('aws_iam');
  const policyDocPath = policyDocument ? getTempFilePath('aws_iam_policy', 'json') : undefined;
  const assumeRoleDocPath = assumeRolePolicyDocument ? getTempFilePath('aws_iam_assume_role', 'json') : undefined;
  
  // Write policy documents to files if provided
  if (policyDocument && policyDocPath) {
    safeWriteFile(policyDocPath, JSON.stringify(policyDocument, null, 2));
  }
  
  if (assumeRolePolicyDocument && assumeRoleDocPath) {
    safeWriteFile(assumeRoleDocPath, JSON.stringify(assumeRolePolicyDocument, null, 2));
  }
  
  let playbookContent = `---
- name: AWS IAM ${action} operation
  hosts: localhost
  connection: local
  gather_facts: no
  tasks:`;
  
  switch (action) {
    case 'list_roles':
      playbookContent += `
    - name: List IAM roles
      amazon.aws.iam_role_info:
        region: "${region}"
      register: iam_roles
    
    - name: Display roles
      debug:
        var: iam_roles.iam_roles`;
      break;
      
    case 'list_policies':
      playbookContent += `
    - name: List IAM policies
      amazon.aws.iam_policy_info:
        region: "${region}"
      register: iam_policies
    
    - name: Display policies
      debug:
        var: iam_policies.policies`;
      break;
      
    case 'create_role':
      playbookContent += `
    - name: Create IAM role
      amazon.aws.iam_role:
        region: "${region}"
        name: "${roleName}"
        assume_role_policy_document: ${assumeRoleDocPath ? `"{{ lookup('file', '${assumeRoleDocPath}') }}"` : ''}
        state: present
${formatYamlParams({
  path,
  managed_policies: managedPolicies
})}
      register: iam_role
    
    - name: Display role details
      debug:
        var: iam_role`;
      break;
      
    case 'create_policy':
      playbookContent += `
    - name: Create IAM policy
      amazon.aws.iam_policy:
        region: "${region}"
        policy_name: "${policyName}"
        policy_document: ${policyDocPath ? `"{{ lookup('file', '${policyDocPath}') }}"` : ''}
        state: present
${formatYamlParams({ path })}
      register: iam_policy
    
    - name: Display policy details
      debug:
        var: iam_policy`;
      break;
      
    case 'delete_role':
      playbookContent += `
    - name: Delete IAM role
      amazon.aws.iam_role:
        region: "${region}"
        name: "${roleName}"
        state: absent
      register: iam_role_delete
    
    - name: Display deletion result
      debug:
        var: iam_role_delete`;
      break;
      
    case 'delete_policy':
      playbookContent += `
    - name: Delete IAM policy
      amazon.aws.iam_policy:
        region: "${region}"
        policy_name: "${policyName}"
        state: absent
      register: iam_policy_delete
    
    - name: Display deletion result
      debug:
        var: iam_policy_delete`;
      break;
      
    default:
      throw new AnsibleError(`Unknown IAM action: ${action}`);
  }
  
  // Write playbook to file
  safeWriteFile(playbookPath, playbookContent);
  
  // Execute the playbook
  const result = executeAnsiblePlaybook(playbookPath);
  
  // Clean up policy doc files if they were created
  [policyDocPath, assumeRoleDocPath].forEach(path => {
    if (path) {
      try {
        unlinkSync(path);
      } catch (cleanupError) {
        console.error(`Failed to clean up temporary file ${path}:`, cleanupError);
      }
    }
  });
  
  return result;
}

/**
 * RDS Operations
 */
export async function rdsOperations(args: RDSOptions): Promise<string> {
  await verifyAwsCredentials();

  const { action, region, dbInstanceIdentifier, dbEngine, dbInstanceClass, allocatedStorage, masterUsername, 
    masterPassword, vpcSecurityGroupIds, dbSubnetGroupName, tags, multiAZ, backupRetentionPeriod } = args;

  // Create temporary playbook file
  const playbookPath = getTempFilePath('aws_rds');
  
  let playbookContent = `---
- name: AWS RDS ${action} operation
  hosts: localhost
  connection: local
  gather_facts: no
  tasks:`;
  
  switch (action) {
    case 'list':
      playbookContent += `
    - name: List RDS instances
      amazon.aws.rds_instance_info:
        region: "${region}"
      register: rds_info
    
    - name: Display RDS instances
      debug:
        var: rds_info.instances`;
      break;
      
    case 'create':
      playbookContent += `
    - name: Create RDS instance
      amazon.aws.rds_instance:
        region: "${region}"
        db_instance_identifier: "${dbInstanceIdentifier}"
        engine: "${dbEngine}"
        db_instance_class: "${dbInstanceClass}"
        allocated_storage: ${allocatedStorage}
        master_username: "${masterUsername}"
        master_user_password: "${masterPassword}"
        state: present
${formatYamlParams({
  vpc_security_group_ids: vpcSecurityGroupIds,
  db_subnet_group_name: dbSubnetGroupName,
  tags,
  multi_az: multiAZ,
  backup_retention_period: backupRetentionPeriod
})}
      register: rds_create
    
    - name: Display RDS instance details
      debug:
        var: rds_create`;
      break;
      
    case 'delete':
      playbookContent += `
    - name: Delete RDS instance
      amazon.aws.rds_instance:
        region: "${region}"
        db_instance_identifier: "${dbInstanceIdentifier}"
        state: absent
        skip_final_snapshot: true
      register: rds_delete
    
    - name: Display deletion result
      debug:
        var: rds_delete`;
      break;
      
    case 'start':
      playbookContent += `
    - name: Start RDS instance
      amazon.aws.rds_instance:
        region: "${region}"
        db_instance_identifier: "${dbInstanceIdentifier}"
        state: started
      register: rds_start
    
    - name: Display start result
      debug:
        var: rds_start`;
      break;
      
    case 'stop':
      playbookContent += `
    - name: Stop RDS instance
      amazon.aws.rds_instance:
        region: "${region}"
        db_instance_identifier: "${dbInstanceIdentifier}"
        state: stopped
      register: rds_stop
    
    - name: Display stop result
      debug:
        var: rds_stop`;
      break;
      
    default:
      throw new AnsibleError(`Unknown RDS action: ${action}`);
  }
  
  // Write playbook to file
  safeWriteFile(playbookPath, playbookContent);
  
  // Execute the playbook
  return executeAnsiblePlaybook(playbookPath);
}

/**
 * Route53 Operations
 */
export async function route53Operations(args: Route53Options): Promise<string> {
  await verifyAwsCredentials();

  const { action, region, zoneId, zoneName, recordName, recordType, recordTtl, recordValue, recordState } = args;

  // Create temporary playbook file
  const playbookPath = getTempFilePath('aws_route53');
  
  let playbookContent = `---
- name: AWS Route53 ${action} operation
  hosts: localhost
  connection: local
  gather_facts: no
  tasks:`;
  
  switch (action) {
    case 'list_zones':
      playbookContent += `
    - name: List Route53 hosted zones
      amazon.aws.route53_info:
        region: "${region}"
        query: hosted_zone
      register: route53_zones
    
    - name: Display hosted zones
      debug:
        var: route53_zones.HostedZones`;
      break;
      
    case 'list_records':
      playbookContent += `
    - name: List Route53 records
      amazon.aws.route53_info:
        region: "${region}"
        query: record_sets
        hosted_zone_id: "${zoneId}"
      register: route53_records
    
    - name: Display records
      debug:
        var: route53_records.ResourceRecordSets`;
      break;
      
    case 'create_zone':
      playbookContent += `
    - name: Create Route53 hosted zone
      amazon.aws.route53_zone:
        region: "${region}"
        zone: "${zoneName}"
        state: present
      register: route53_zone
    
    - name: Display zone details
      debug:
        var: route53_zone`;
      break;
      
    case 'create_record':
      playbookContent += `
    - name: Create Route53 record
      amazon.aws.route53:
        region: "${region}"
        zone: "${zoneName}"
        record: "${recordName}"
        type: "${recordType}"
        ttl: ${recordTtl || 300}
        value: ${JSON.stringify(Array.isArray(recordValue) ? recordValue : [recordValue])}
        state: ${recordState || 'present'}
      register: route53_record
    
    - name: Display record details
      debug:
        var: route53_record`;
      break;
      
    case 'delete_record':
      playbookContent += `
    - name: Delete Route53 record
      amazon.aws.route53:
        region: "${region}"
        zone: "${zoneName}"
        record: "${recordName}"
        type: "${recordType}"
        value: ${JSON.stringify(Array.isArray(recordValue) ? recordValue : [recordValue])}
        state: absent
      register: route53_record_delete
    
    - name: Display deletion result
      debug:
        var: route53_record_delete`;
      break;
      
    case 'delete_zone':
      playbookContent += `
    - name: Delete Route53 hosted zone
      amazon.aws.route53_zone:
        region: "${region}"
        zone: "${zoneName}"
        state: absent
      register: route53_zone_delete
    
    - name: Display deletion result
      debug:
        var: route53_zone_delete`;
      break;
      
    default:
      throw new AnsibleError(`Unknown Route53 action: ${action}`);
  }
  
  // Write playbook to file
  safeWriteFile(playbookPath, playbookContent);
  
  // Execute the playbook
  return executeAnsiblePlaybook(playbookPath);
}

/**
 * ELB Operations
 */
export async function elbOperations(args: ELBOptions): Promise<string> {
  await verifyAwsCredentials();

  const { action, region, name, lbType, scheme, subnets, securityGroups, listeners, healthCheck, tags } = args;

  // Create temporary playbook file
  const playbookPath = getTempFilePath('aws_elb');
  
  let moduleType = lbType === 'application' || lbType === 'network' ? 'elb_application_lb' : 'elb_classic_lb';
  
  let playbookContent = `---
- name: AWS ELB ${action} operation
  hosts: localhost
  connection: local
  gather_facts: no
  tasks:`;
  
  switch (action) {
    case 'list':
      playbookContent += `
    - name: List load balancers
      amazon.aws.${lbType === 'application' || lbType === 'network' ? 'elb_application_lb_info' : 'elb_classic_lb_info'}:
        region: "${region}"
      register: elb_info
    
    - name: Display load balancers
      debug:
        var: elb_info`;
      break;
      
    case 'create':
      playbookContent += `
    - name: Create load balancer
      amazon.aws.${moduleType}:
        region: "${region}"
        name: "${name}"
        state: present
${formatYamlParams({
  scheme,
  subnets,
  security_groups: securityGroups,
  listeners,
  health_check: healthCheck,
  tags
})}
      register: elb_create
    
    - name: Display load balancer details
      debug:
        var: elb_create`;
      break;
      
    case 'delete':
      playbookContent += `
    - name: Delete load balancer
      amazon.aws.${moduleType}:
        region: "${region}"
        name: "${name}"
        state: absent
      register: elb_delete
    
    - name: Display deletion result
      debug:
        var: elb_delete`;
      break;
      
    default:
      throw new AnsibleError(`Unknown ELB action: ${action}`);
  }
  
  // Write playbook to file
  safeWriteFile(playbookPath, playbookContent);
  
  // Execute the playbook
  return executeAnsiblePlaybook(playbookPath);
}

/**
 * Lambda Operations
 */
export async function lambdaOperations(args: LambdaOptions): Promise<string> {
  await verifyAwsCredentials();

  const { action, region, name, zipFile, s3Bucket, s3Key, functionCode, runtime, handler, role, description, timeout, memorySize, environment, tags } = args;

  // Create temporary playbook file
  const playbookPath = getTempFilePath('aws_lambda');
  const codeFilePath = functionCode ? getTempFilePath('aws_lambda_code', 'py') : undefined;
  
  // Write function code to file if provided
  if (functionCode && codeFilePath) {
    safeWriteFile(codeFilePath, functionCode);
  }
  
  let playbookContent = `---
- name: AWS Lambda ${action} operation
  hosts: localhost
  connection: local
  gather_facts: no
  tasks:`;
  
  switch (action) {
    case 'list':
      playbookContent += `
    - name: List Lambda functions
      amazon.aws.lambda_info:
        region: "${region}"
      register: lambda_info
    
    - name: Display Lambda functions
      debug:
        var: lambda_info.functions`;
      break;
      
    case 'create':
    case 'update':
      let codeParams = '';
      if (zipFile) {
        codeParams = `zip_file: "${zipFile}"`;
      } else if (s3Bucket && s3Key) {
        codeParams = `s3_bucket: "${s3Bucket}"\n        s3_key: "${s3Key}"`;
      } else if (codeFilePath) {
        // Zip the file if code was provided directly
        const zipPath = getTempFilePath('lambda_function', 'zip');
        const zipCommand = `cd $(dirname "${codeFilePath}") && zip -j "${zipPath}" "${codeFilePath}"`;
        try {
          execSync(zipCommand);
          codeParams = `zip_file: "${zipPath}"`;
        } catch (error) {
          throw new AnsibleError(`Failed to create zip file for Lambda function: ${error}`);
        }
      }
      
      playbookContent += `
    - name: ${action === 'create' ? 'Create' : 'Update'} Lambda function
      amazon.aws.lambda:
        region: "${region}"
        name: "${name}"
        state: present
        ${codeParams}
${formatYamlParams({
  runtime,
  handler,
  role,
  description,
  timeout,
  memory_size: memorySize,
  environment_variables: environment,
  tags
})}
      register: lambda_create
    
    - name: Display function details
      debug:
        var: lambda_create`;
      break;
      
    case 'delete':
      playbookContent += `
    - name: Delete Lambda function
      amazon.aws.lambda:
        region: "${region}"
        name: "${name}"
        state: absent
      register: lambda_delete
    
    - name: Display deletion result
      debug:
        var: lambda_delete`;
      break;
      
    case 'invoke':
      playbookContent += `
    - name: Invoke Lambda function
      amazon.aws.lambda_invoke:
        region: "${region}"
        function_name: "${name}"
        invocation_type: RequestResponse
      register: lambda_invoke
    
    - name: Display invocation result
      debug:
        var: lambda_invoke`;
      break;
      
    default:
      throw new AnsibleError(`Unknown Lambda action: ${action}`);
  }
  
  // Write playbook to file
  safeWriteFile(playbookPath, playbookContent);
  
  // Execute the playbook
  const result = executeAnsiblePlaybook(playbookPath);
  
  // Clean up code file if it was created
  if (codeFilePath) {
    try {
      unlinkSync(codeFilePath);
    } catch (cleanupError) {
      console.error(`Failed to clean up temporary code file ${codeFilePath}:`, cleanupError);
    }
  }
  
  return result;
}

/**
 * Dynamic Inventory Operations
 */
export async function dynamicInventoryOperations(args: DynamicInventoryOptions): Promise<string> {
  await verifyAwsCredentials();

  const { region, filters, hostnames, keyed_groups } = args;

  // Create temporary inventory file
  const inventoryPath = getTempFilePath('aws_dynamic_inventory', 'yml');
  
  let inventoryContent = `---
plugin: amazon.aws.aws_ec2
regions:
  - ${region}`;

  if (filters) {
    inventoryContent += `
filters:
${Object.entries(filters).map(([key, value]) => `  ${key}: ${JSON.stringify(value)}`).join('\n')}`;
  }

  if (hostnames) {
    inventoryContent += `
hostnames:
  - ${hostnames}`;
  }

  if (keyed_groups && keyed_groups.length > 0) {
    inventoryContent += `
keyed_groups:
${keyed_groups.map(group => `  - ${group}`).join('\n')}`;
  }

  // Write inventory to file
  safeWriteFile(inventoryPath, inventoryContent);
  
  // Create a temporary playbook to use the dynamic inventory
  const playbookPath = getTempFilePath('aws_dynamic_inventory_test');
  
  const playbookContent = `---
- name: Test AWS Dynamic Inventory
  hosts: localhost
  connection: local
  gather_facts: no
  tasks:
    - name: Display AWS EC2 dynamic inventory
      ansible.builtin.debug:
        msg: "Successfully created AWS EC2 dynamic inventory at ${inventoryPath}"`;
  
  // Write playbook to file
  safeWriteFile(playbookPath, playbookContent);
  
  // Execute the playbook
  const result = executeAnsiblePlaybook(playbookPath, `-i ${inventoryPath} --list-hosts all`);
  
  return `Dynamic Inventory created at ${inventoryPath}\n\n${result}`;
}
