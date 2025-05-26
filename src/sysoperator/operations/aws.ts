import { AnsibleExecutionError } from '../common/errors.js';
import { 
  execAsync, 
  createTempDirectory, 
  writeTempFile, 
  cleanupTempDirectory 
} from '../common/utils.js';
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
import { AnsibleError } from '../common/errors.js';
import { verifyAwsCredentials } from '../common/utils.js';

/**
 * Convert object to YAML-formatted string for Ansible playbook
 */
const formatYamlParams = (params: Record<string, any>, indentation: number = 6): string => {
  // Filter out undefined/null values and format each key-value pair
  return Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key, value]) => {
      const indent = ' '.repeat(indentation);
      let formattedValue;
      
      // Format based on value type
      if (typeof value === 'string') {
        // Basic YAML string escaping (double quotes, escape backslashes and double quotes)
        formattedValue = `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
      } else if (Array.isArray(value) || typeof value === 'object') {
        // Use JSON.stringify for arrays and objects, assuming it's valid YAML subset
        formattedValue = JSON.stringify(value); 
      } else {
        formattedValue = value; // Numbers, booleans
      }
      return `${indent}${key}: ${formattedValue}`;
    })
    .join('\n');
};

/**
 * Helper function to execute a dynamically generated AWS playbook
 */
async function executeAwsPlaybook(
  operationName: string, 
  playbookContent: string, 
  extraParams: string = '',
  tempFiles: { filename: string, content: string }[] = [] // For additional files like templates, policies
): Promise<string> {
  let tempDir: string | undefined;
  try {
    // Create a unique temporary directory
    tempDir = await createTempDirectory(`ansible-aws-${operationName}`);
    
    // Write the main playbook file
    const playbookPath = await writeTempFile(tempDir, 'playbook.yml', playbookContent);
    
    // Write any additional temporary files
    for (const file of tempFiles) {
      await writeTempFile(tempDir, file.filename, file.content);
    }

    // Build the command
    const command = `ansible-playbook ${playbookPath} ${extraParams}`;
    console.error(`Executing: ${command}`);

    // Execute the playbook asynchronously
    const { stdout, stderr } = await execAsync(command);
    
    // Return stdout, or a success message if stdout is empty
    return stdout || `${operationName} completed successfully (no output).`;

  } catch (error: any) {
    // Handle execution errors
    const errorMessage = error.stderr || error.message || 'Unknown error';
    throw new AnsibleExecutionError(`Ansible execution failed for ${operationName}: ${errorMessage}`, error.stderr);
  } finally {
    // Ensure cleanup happens even if errors occur
    if (tempDir) {
      await cleanupTempDirectory(tempDir);
    }
  }
}


/**
 * EC2 Instance Operations
 */
export async function ec2InstanceOperations(args: EC2InstanceOptions): Promise<string> {
  await verifyAwsCredentials();

  const { action, region, instanceIds, filters, instanceType, imageId, keyName, securityGroups, userData, count, tags, waitForCompletion, terminationProtection, ...restParams } = args;

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
      // Should be caught by Zod validation, but good to have a fallback
      throw new AnsibleError(`Unsupported EC2 action: ${action}`);
  }
  
  // Execute the generated playbook
  return executeAwsPlaybook(`ec2-${action}`, playbookContent);
}

/**
 * S3 Operations
 */
export async function s3Operations(args: S3Options): Promise<string> {
  await verifyAwsCredentials();

  const { action, region, bucket, objectKey, localPath, acl, tags, metadata, contentType } = args;

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
      throw new AnsibleError(`Unsupported S3 action: ${action}`);
  }
  
  // Execute the generated playbook
  return executeAwsPlaybook(`s3-${action}`, playbookContent);
}

/**
 * VPC Operations
 */
export async function vpcOperations(args: VPCOptions): Promise<string> {
  await verifyAwsCredentials();

  const { action, region, vpcId, cidrBlock, name, dnsSupport, dnsHostnames, tags, subnets } = args;

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
      throw new AnsibleError(`Unsupported VPC action: ${action}`);
  }
  
  // Execute the generated playbook
  return executeAwsPlaybook(`vpc-${action}`, playbookContent);
}

/**
 * CloudFormation Operations
 */
export async function cloudFormationOperations(args: CloudFormationOptions): Promise<string> {
  await verifyAwsCredentials();

  const { action, region, stackName, templateBody, templateUrl, parameters, capabilities, tags } = args;

  const tempFiles: { filename: string, content: string }[] = [];
  let templateParam = '';

  if (templateBody) {
    // Prepare template body to be written to a temp file
    tempFiles.push({ filename: 'template.cfn', content: templateBody });
    templateParam = 'template: "template.cfn"'; // Reference the temp file name
  } else if (templateUrl) {
    templateParam = `template_url: "${templateUrl}"`;
  } else if (action === 'create' || action === 'update') {
    // Template is required for create/update
    throw new AnsibleError('Either templateBody or templateUrl must be provided for CloudFormation create/update actions.');
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
      playbookContent += `
    - name: ${action === 'create' ? 'Create' : 'Update'} CloudFormation stack
      amazon.aws.cloudformation:
        region: "${region}"
        stack_name: "${stackName}"
        state: present
        ${templateParam} # Use the determined template parameter
${formatYamlParams({
  template_parameters: parameters,
  capabilities,
  tags
})}
      register: cfn_result
    
    - name: Display stack outputs/result
      debug:
        var: cfn_result`;
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
      throw new AnsibleError(`Unsupported CloudFormation action: ${action}`);
  }
  
  // Execute the generated playbook, passing template body if needed
  return executeAwsPlaybook(`cloudformation-${action}`, playbookContent, '', tempFiles);
}

/**
 * IAM Operations
 */
export async function iamOperations(args: IAMOptions): Promise<string> {
  await verifyAwsCredentials();

  const { action, region, policyName, policyDocument, path, roleName, assumeRolePolicyDocument, managedPolicies } = args;

  const tempFiles: { filename: string, content: string }[] = [];
  let policyDocParam = '';
  let assumeRoleDocParam = '';

  if (policyDocument) {
    const policyFilename = 'policy.json';
    tempFiles.push({ filename: policyFilename, content: JSON.stringify(policyDocument, null, 2) });
    policyDocParam = `policy_document: "{{ lookup('file', '${policyFilename}') }}"`;
  }

  if (assumeRolePolicyDocument) {
    const assumeRoleFilename = 'assume_role_policy.json';
    tempFiles.push({ filename: assumeRoleFilename, content: JSON.stringify(assumeRolePolicyDocument, null, 2) });
    assumeRoleDocParam = `assume_role_policy_document: "{{ lookup('file', '${assumeRoleFilename}') }}"`;
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
        ${assumeRoleDocParam}
        state: present
${formatYamlParams({
  path,
  managed_policies: managedPolicies
})}
      register: iam_result
    
    - name: Display role details
      debug:
        var: iam_result`;
      break;
      
    case 'create_policy':
      playbookContent += `
    - name: Create IAM policy
      amazon.aws.iam_policy:
        region: "${region}"
        policy_name: "${policyName}"
        ${policyDocParam}
        state: present
${formatYamlParams({ path })}
      register: iam_result
    
    - name: Display policy details
      debug:
        var: iam_result`;
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
      throw new AnsibleError(`Unsupported IAM action: ${action}`);
  }
  
  // Execute the generated playbook, passing policy docs if needed
  return executeAwsPlaybook(`iam-${action}`, playbookContent, '', tempFiles);
}

/**
 * RDS Operations
 */
export async function rdsOperations(args: RDSOptions): Promise<string> {
  await verifyAwsCredentials();

  const { action, region, dbInstanceIdentifier, dbEngine, dbInstanceClass, allocatedStorage, masterUsername, 
    masterPassword, vpcSecurityGroupIds, dbSubnetGroupName, tags, multiAZ, backupRetentionPeriod, skipFinalSnapshot } = args;

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
  backup_retention_period: backupRetentionPeriod,
  // Add other relevant RDS params here if needed
})}
      register: rds_result
    
    - name: Display RDS instance details
      debug:
        var: rds_result`;
      break;
      
    case 'delete':
      playbookContent += `
    - name: Delete RDS instance
      amazon.aws.rds_instance:
        region: "${region}"
        db_instance_identifier: "${dbInstanceIdentifier}"
        state: absent
        skip_final_snapshot: ${skipFinalSnapshot ? 'yes' : 'no'}
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
      throw new AnsibleError(`Unsupported RDS action: ${action}`);
  }
  
  // Execute the generated playbook
  return executeAwsPlaybook(`rds-${action}`, playbookContent);
}

/**
 * Route53 Operations
 */
export async function route53Operations(args: Route53Options): Promise<string> {
  await verifyAwsCredentials();

  const { action, region, zoneId, zoneName, recordName, recordType, recordTtl, recordValue, recordState, comment } = args;

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
${formatYamlParams({ comment })}
      register: route53_result
    
    - name: Display zone details
      debug:
        var: route53_result`;
      break;
      
    case 'create_record':
      playbookContent += `
    - name: Create Route53 record
      amazon.aws.route53:
        region: "${region}"
        zone: "${zoneName}"
        record: "${recordName}"
        type: "${recordType}"
        ttl: ${recordTtl ?? 300}
        value: ${JSON.stringify(Array.isArray(recordValue) ? recordValue : [recordValue])}
        state: ${recordState ?? 'present'}
${formatYamlParams({ comment })}
      register: route53_result
    
    - name: Display record details
      debug:
        var: route53_result`;
      break;
      
    case 'delete_record':
      playbookContent += `
    - name: Delete Route53 record
      amazon.aws.route53:
        region: "${region}"
        zone: "${zoneName}"
        record: "${recordName}"
        type: "${recordType}"
        # Value might be needed for deletion depending on the record type/setup
        value: ${JSON.stringify(Array.isArray(recordValue) ? recordValue : [recordValue])} 
        state: absent
      register: route53_delete
    
    - name: Display deletion result
      debug:
        var: route53_delete`;
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
      throw new AnsibleError(`Unsupported Route53 action: ${action}`);
  }
  
  // Execute the generated playbook
  return executeAwsPlaybook(`route53-${action}`, playbookContent);
}

/**
 * ELB Operations
 */
export async function elbOperations(args: ELBOptions): Promise<string> {
  await verifyAwsCredentials();

  const { action, region, name, lbType = 'application', scheme, subnets, securityGroups, listeners, healthCheck, tags, targetGroups } = args;

  // Determine module based on lbType
  let moduleName: string;
  let infoModuleName: string;
  switch (lbType) {
    case 'application':
      moduleName = 'amazon.aws.elb_application_lb';
      infoModuleName = 'amazon.aws.elb_application_lb_info';
      break;
    case 'network':
      moduleName = 'amazon.aws.elb_network_lb';
      infoModuleName = 'amazon.aws.elb_network_lb_info';
      break;
    case 'classic':
      moduleName = 'amazon.aws.elb_classic_lb';
      infoModuleName = 'amazon.aws.elb_classic_lb_info';
      break;
    default:
      throw new AnsibleError(`Unsupported ELB type: ${lbType}`);
  }

  let playbookContent = `---
- name: AWS ELB ${action} operation (${lbType})
  hosts: localhost
  connection: local
  gather_facts: no
  tasks:`;
  
  switch (action) {
    case 'list':
      playbookContent += `
    - name: List ${lbType} load balancers
      ${infoModuleName}:
        region: "${region}"
      register: elb_info
    
    - name: Display load balancers
      debug:
        var: elb_info`; // Adjust var based on actual module output if needed
      break;
      
    case 'create':
      playbookContent += `
    - name: Create ${lbType} load balancer
      ${moduleName}:
        region: "${region}"
        name: "${name}"
        state: present
${formatYamlParams({
  scheme,
  subnets,
  security_groups: securityGroups,
  listeners, // May need adjustment for different LB types
  health_check: healthCheck, // May need adjustment
  tags,
  target_groups: targetGroups // For Application/Network LBs
})}
      register: elb_result
    
    - name: Display load balancer details
      debug:
        var: elb_result`;
      break;
      
    case 'delete':
      playbookContent += `
    - name: Delete ${lbType} load balancer
      ${moduleName}:
        region: "${region}"
        name: "${name}"
        state: absent
      register: elb_delete
    
    - name: Display deletion result
      debug:
        var: elb_delete`;
      break;
      
    default:
      throw new AnsibleError(`Unsupported ELB action: ${action}`);
  }
  
  // Execute the generated playbook
  return executeAwsPlaybook(`elb-${action}`, playbookContent);
}

/**
 * Lambda Operations
 */
export async function lambdaOperations(args: LambdaOptions): Promise<string> {
  await verifyAwsCredentials();

  const { action, region, name, zipFile, s3Bucket, s3Key, functionCode, runtime, handler, role, description, timeout, memorySize, environment, tags, payload, invocationType } = args;

  const tempFiles: { filename: string, content: string }[] = [];
  let codeParams = '';
  let zipPath: string | undefined; // To track zip file for cleanup

  if (zipFile) {
    // Assuming zipFile is a path accessible to the server running this code
    codeParams = `zip_file: "${zipFile}"`; 
  } else if (s3Bucket && s3Key) {
    codeParams = `s3_bucket: "${s3Bucket}"\n        s3_key: "${s3Key}"`;
  } else if (functionCode) {
    // If code is provided directly, write it to a temp file and prepare to zip it
    const codeFilename = 'lambda_function.py'; // Assuming Python, adjust if needed
    tempFiles.push({ filename: codeFilename, content: functionCode });
    
    // We'll need to zip this file before executing Ansible
    // This requires the 'zip' utility on the server
    zipPath = 'lambda_function.zip'; // Relative path within temp dir
    codeParams = `zip_file: "${zipPath}"`; 
  } else if (action === 'create' || action === 'update') {
    throw new AnsibleError('Lambda code source (zipFile, S3, or functionCode) must be provided for create/update actions.');
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
      playbookContent += `
    - name: ${action === 'create' ? 'Create' : 'Update'} Lambda function
      amazon.aws.lambda:
        region: "${region}"
        name: "${name}"
        state: present
        ${codeParams} # Use determined code source params
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
      register: lambda_result
    
    - name: Display function details
      debug:
        var: lambda_result`;
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
        invocation_type: "${invocationType || 'RequestResponse'}"
${formatYamlParams({ payload })}
      register: lambda_invoke
    
    - name: Display invocation result
      debug:
        var: lambda_invoke`;
      break;
      
    default:
      throw new AnsibleError(`Unsupported Lambda action: ${action}`);
  }

  // Special handling for zipping code before executing Ansible
  let tempDir: string | undefined;
  try {
    tempDir = await createTempDirectory(`ansible-aws-lambda-${action}`);
    
    // Write the main playbook file
    const playbookPath = await writeTempFile(tempDir, 'playbook.yml', playbookContent);
    
    // Write any additional temporary files (like the function code)
    for (const file of tempFiles) {
      await writeTempFile(tempDir, file.filename, file.content);
    }

    // If we need to zip the code, do it now using execAsync
    if (zipPath && tempFiles.some(f => f.filename === 'lambda_function.py')) {
      const codeFilePath = `${tempDir}/lambda_function.py`;
      const zipFilePath = `${tempDir}/${zipPath}`;
      const zipCommand = `zip -j "${zipFilePath}" "${codeFilePath}"`; 
      console.error(`Executing: ${zipCommand}`);
      await execAsync(zipCommand, { cwd: tempDir }); // Run zip in the temp directory
    }

    // Build the final Ansible command
    const command = `ansible-playbook ${playbookPath}`;
    console.error(`Executing: ${command}`);

    // Execute the playbook asynchronously
    const { stdout, stderr } = await execAsync(command);
    
    return stdout || `Lambda ${action} completed successfully (no output).`;

  } catch (error: any) {
    const errorMessage = error.stderr || error.message || 'Unknown error';
    throw new AnsibleExecutionError(`Ansible execution failed for lambda-${action}: ${errorMessage}`, error.stderr);
  } finally {
    if (tempDir) {
      await cleanupTempDirectory(tempDir);
    }
  }
}

/**
 * Dynamic Inventory Operations
 */
export async function dynamicInventoryOperations(args: DynamicInventoryOptions): Promise<string> {
  await verifyAwsCredentials();

  const { region, filters, hostnames, keyed_groups, compose } = args;

  let inventoryContent = `---
plugin: amazon.aws.aws_ec2
regions:
  - ${region}`;

  if (filters) {
    inventoryContent += `
filters:
${formatYamlParams(filters, 2)}`; // Indent level 2 for filters
  }

  if (hostnames && hostnames.length > 0) {
    inventoryContent += `
hostnames:
${hostnames.map(h => `  - ${JSON.stringify(h)}`).join('\n')}`;
  }

  if (keyed_groups && keyed_groups.length > 0) {
    inventoryContent += `
keyed_groups:
${keyed_groups.map(group => `  - prefix: ${group.prefix}\n    key: ${group.key}\n    separator: ${group.separator ?? ''}`).join('\n')}`;
  }
  
  if (compose) {
    inventoryContent += `
compose:
${formatYamlParams(compose, 2)}`; // Indent level 2 for compose
  }

  // This operation doesn't run a playbook, it *generates* an inventory file
  // and then tests it. We'll adapt the helper pattern slightly.
  let tempDir: string | undefined;
  try {
    tempDir = await createTempDirectory('ansible-aws-dyninv');
    const inventoryPath = await writeTempFile(tempDir, 'inventory.aws_ec2.yml', inventoryContent);

    // Create a simple test playbook
    const testPlaybookContent = `---
- name: Test AWS Dynamic Inventory
  hosts: all # Target hosts defined by the dynamic inventory
  gather_facts: no
  tasks:
    - name: Ping hosts found by dynamic inventory
      ansible.builtin.ping:`;

    const testPlaybookPath = await writeTempFile(tempDir, 'test_playbook.yml', testPlaybookContent);

    // Execute ansible-inventory --list first to show the structure
    const listCommand = `ansible-inventory -i ${inventoryPath} --list`;
    console.error(`Executing: ${listCommand}`);
    const listResult = await execAsync(listCommand);

    // Execute the test playbook using the dynamic inventory
    const runCommand = `ansible-playbook -i ${inventoryPath} ${testPlaybookPath}`;
    console.error(`Executing: ${runCommand}`);
    const runResult = await execAsync(runCommand);

    return `Dynamic Inventory (${inventoryPath}) Content:\n${inventoryContent}\n\nInventory List Output:\n${listResult.stdout}\n\nPlaybook Test Output:\n${runResult.stdout}`;

  } catch (error: any) {
    const errorMessage = error.stderr || error.message || 'Unknown error';
    throw new AnsibleExecutionError(`Failed dynamic inventory operation: ${errorMessage}`, error.stderr);
  } finally {
    if (tempDir) {
      await cleanupTempDirectory(tempDir);
    }
  }
}
