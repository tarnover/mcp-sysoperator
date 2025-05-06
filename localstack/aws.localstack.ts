// Modified aws.ts for LocalStack integration
// This file contains modified functions from src/ansible-mcp-server/operations/aws.ts
// to use LocalStack instead of real AWS

import { execAsync, createTempDirectory, writeTempFile, cleanupTempDirectory } from './utils.localstack.js';

/**
 * Run an AWS S3 operation using LocalStack
 * @param action The S3 action to perform (list_buckets, create_bucket, delete_bucket, list_objects, upload, download)
 * @param region The AWS region
 * @param bucket The S3 bucket name (for bucket-specific operations)
 * @param objectKey The S3 object key (for object-specific operations)
 * @param localPath The local file path (for upload/download operations)
 * @param acl The ACL to apply (for create_bucket and upload operations)
 * @param tags The tags to apply (for create_bucket and upload operations)
 * @param metadata The metadata to apply (for upload operations)
 * @param contentType The content type (for upload operations)
 * @returns The result of the operation
 */
export async function runS3Operation(
  action: string,
  region: string,
  bucket?: string,
  objectKey?: string,
  localPath?: string,
  acl?: string,
  tags?: Record<string, string>,
  metadata?: Record<string, string>,
  contentType?: string
): Promise<any> {
  console.log(`Running s3 ${action} operation with LocalStack`);
  
  switch (action) {
    case 'list_buckets':
      return await execAsync('awslocal s3 ls');
      
    case 'create_bucket':
      if (!bucket) {
        throw new Error('Bucket name is required for create_bucket operation');
      }
      
      let createCommand = `awslocal s3 mb s3://${bucket}`;
      
      if (region && region !== 'us-east-1') {
        createCommand += ` --region ${region}`;
      }
      
      return await execAsync(createCommand);
      
    case 'delete_bucket':
      if (!bucket) {
        throw new Error('Bucket name is required for delete_bucket operation');
      }
      
      return await execAsync(`awslocal s3 rb s3://${bucket} --force`);
      
    case 'list_objects':
      if (!bucket) {
        throw new Error('Bucket name is required for list_objects operation');
      }
      
      return await execAsync(`awslocal s3 ls s3://${bucket}`);
      
    case 'upload':
      if (!bucket || !objectKey || !localPath) {
        throw new Error('Bucket name, object key, and local path are required for upload operation');
      }
      
      let uploadCommand = `awslocal s3 cp ${localPath} s3://${bucket}/${objectKey}`;
      
      if (acl) {
        uploadCommand += ` --acl ${acl}`;
      }
      
      if (contentType) {
        uploadCommand += ` --content-type "${contentType}"`;
      }
      
      // Handle metadata
      if (metadata && Object.keys(metadata).length > 0) {
        const metadataStr = Object.entries(metadata)
          .map(([key, value]) => `${key}=${value}`)
          .join('&');
        uploadCommand += ` --metadata "${metadataStr}"`;
      }
      
      // Handle tags
      if (tags && Object.keys(tags).length > 0) {
        const tagsStr = Object.entries(tags)
          .map(([key, value]) => `${key}=${value}`)
          .join('&');
        uploadCommand += ` --tagging "${tagsStr}"`;
      }
      
      return await execAsync(uploadCommand);
      
    case 'download':
      if (!bucket || !objectKey || !localPath) {
        throw new Error('Bucket name, object key, and local path are required for download operation');
      }
      
      return await execAsync(`awslocal s3 cp s3://${bucket}/${objectKey} ${localPath}`);
      
    default:
      throw new Error(`Unsupported S3 action: ${action}`);
  }
}

/**
 * Run an AWS EC2 operation using LocalStack
 * @param action The EC2 action to perform (list, create, terminate, start, stop)
 * @param region The AWS region
 * @param instanceIds The EC2 instance IDs (for instance-specific operations)
 * @param filters The filters to apply (for list operation)
 * @param instanceType The instance type (for create operation)
 * @param imageId The AMI ID (for create operation)
 * @param keyName The key pair name (for create operation)
 * @param securityGroups The security groups (for create operation)
 * @param userData The user data (for create operation)
 * @param count The number of instances to create (for create operation)
 * @param tags The tags to apply (for create operation)
 * @param waitForCompletion Whether to wait for the operation to complete
 * @param terminationProtection Whether to enable termination protection (for create operation)
 * @returns The result of the operation
 */
export async function runEc2Operation(
  action: string,
  region: string,
  instanceIds?: string[],
  filters?: Record<string, any>,
  instanceType?: string,
  imageId?: string,
  keyName?: string,
  securityGroups?: string[],
  userData?: string,
  count?: number,
  tags?: Record<string, string>,
  waitForCompletion: boolean = true,
  terminationProtection?: boolean
): Promise<any> {
  console.log(`Running ec2 ${action} operation with LocalStack`);
  
  switch (action) {
    case 'list':
      let listCommand = 'awslocal ec2 describe-instances';
      
      if (region) {
        listCommand += ` --region ${region}`;
      }
      
      if (instanceIds && instanceIds.length > 0) {
        listCommand += ` --instance-ids ${instanceIds.join(' ')}`;
      }
      
      if (filters && Object.keys(filters).length > 0) {
        const filtersStr = Object.entries(filters)
          .map(([name, values]) => {
            const valuesArray = Array.isArray(values) ? values : [values];
            return `Name=${name},Values=${valuesArray.join(',')}`;
          })
          .join(' ');
        listCommand += ` --filters ${filtersStr}`;
      }
      
      return await execAsync(listCommand);
      
    case 'create':
      if (!imageId || !instanceType) {
        throw new Error('Image ID and instance type are required for create operation');
      }
      
      let createCommand = `awslocal ec2 run-instances --image-id ${imageId} --instance-type ${instanceType}`;
      
      if (region) {
        createCommand += ` --region ${region}`;
      }
      
      if (count && count > 1) {
        createCommand += ` --count ${count}`;
      }
      
      if (keyName) {
        createCommand += ` --key-name ${keyName}`;
      }
      
      if (securityGroups && securityGroups.length > 0) {
        createCommand += ` --security-groups ${securityGroups.join(' ')}`;
      }
      
      if (userData) {
        // Create a temporary file for user data
        const tempDir = await createTempDirectory('ec2-userdata');
        const userDataFile = await writeTempFile(tempDir, 'userdata.txt', userData);
        createCommand += ` --user-data file://${userDataFile}`;
        
        try {
          const result = await execAsync(createCommand);
          await cleanupTempDirectory(tempDir);
          return result;
        } catch (error) {
          await cleanupTempDirectory(tempDir);
          throw error;
        }
      }
      
      if (terminationProtection) {
        createCommand += ' --disable-api-termination';
      }
      
      // Handle tags
      if (tags && Object.keys(tags).length > 0) {
        const tagsStr = Object.entries(tags)
          .map(([key, value]) => `Key=${key},Value=${value}`)
          .join(' ');
        createCommand += ` --tag-specifications 'ResourceType=instance,Tags=[${tagsStr}]'`;
      }
      
      return await execAsync(createCommand);
      
    case 'terminate':
      if (!instanceIds || instanceIds.length === 0) {
        throw new Error('Instance IDs are required for terminate operation');
      }
      
      let terminateCommand = `awslocal ec2 terminate-instances --instance-ids ${instanceIds.join(' ')}`;
      
      if (region) {
        terminateCommand += ` --region ${region}`;
      }
      
      return await execAsync(terminateCommand);
      
    case 'start':
      if (!instanceIds || instanceIds.length === 0) {
        throw new Error('Instance IDs are required for start operation');
      }
      
      let startCommand = `awslocal ec2 start-instances --instance-ids ${instanceIds.join(' ')}`;
      
      if (region) {
        startCommand += ` --region ${region}`;
      }
      
      return await execAsync(startCommand);
      
    case 'stop':
      if (!instanceIds || instanceIds.length === 0) {
        throw new Error('Instance IDs are required for stop operation');
      }
      
      let stopCommand = `awslocal ec2 stop-instances --instance-ids ${instanceIds.join(' ')}`;
      
      if (region) {
        stopCommand += ` --region ${region}`;
      }
      
      return await execAsync(stopCommand);
      
    default:
      throw new Error(`Unsupported EC2 action: ${action}`);
  }
}

/**
 * Run an AWS CloudFormation operation using LocalStack
 * @param action The CloudFormation action to perform (list, create, update, delete)
 * @param region The AWS region
 * @param stackName The CloudFormation stack name (for stack-specific operations)
 * @param templateBody The CloudFormation template body (for create and update operations)
 * @param templateUrl The CloudFormation template URL (for create and update operations)
 * @param parameters The CloudFormation parameters (for create and update operations)
 * @param capabilities The CloudFormation capabilities (for create and update operations)
 * @param tags The tags to apply (for create and update operations)
 * @returns The result of the operation
 */
export async function runCloudFormationOperation(
  action: string,
  region: string,
  stackName?: string,
  templateBody?: string,
  templateUrl?: string,
  parameters?: Record<string, any>,
  capabilities?: string[],
  tags?: Record<string, string>
): Promise<any> {
  console.log(`Running cloudformation ${action} operation with LocalStack`);
  
  switch (action) {
    case 'list':
      let listCommand = 'awslocal cloudformation list-stacks';
      
      if (region) {
        listCommand += ` --region ${region}`;
      }
      
      return await execAsync(listCommand);
      
    case 'create':
      if (!stackName) {
        throw new Error('Stack name is required for create operation');
      }
      
      if (!templateBody && !templateUrl) {
        throw new Error('Template body or URL is required for create operation');
      }
      
      let createCommand = `awslocal cloudformation create-stack --stack-name ${stackName}`;
      
      if (region) {
        createCommand += ` --region ${region}`;
      }
      
      if (templateBody) {
        // Create a temporary file for the template body
        const tempDir = await createTempDirectory('cf-template');
        const templateFile = await writeTempFile(tempDir, 'template.json', templateBody);
        createCommand += ` --template-body file://${templateFile}`;
        
        try {
          const result = await execAsync(createCommand);
          await cleanupTempDirectory(tempDir);
          return result;
        } catch (error) {
          await cleanupTempDirectory(tempDir);
          throw error;
        }
      } else if (templateUrl) {
        createCommand += ` --template-url ${templateUrl}`;
      }
      
      // Handle parameters
      if (parameters && Object.keys(parameters).length > 0) {
        const parametersStr = Object.entries(parameters)
          .map(([key, value]) => `ParameterKey=${key},ParameterValue=${value}`)
          .join(' ');
        createCommand += ` --parameters ${parametersStr}`;
      }
      
      // Handle capabilities
      if (capabilities && capabilities.length > 0) {
        createCommand += ` --capabilities ${capabilities.join(' ')}`;
      }
      
      // Handle tags
      if (tags && Object.keys(tags).length > 0) {
        const tagsStr = Object.entries(tags)
          .map(([key, value]) => `Key=${key},Value=${value}`)
          .join(' ');
        createCommand += ` --tags ${tagsStr}`;
      }
      
      return await execAsync(createCommand);
      
    case 'update':
      if (!stackName) {
        throw new Error('Stack name is required for update operation');
      }
      
      if (!templateBody && !templateUrl) {
        throw new Error('Template body or URL is required for update operation');
      }
      
      let updateCommand = `awslocal cloudformation update-stack --stack-name ${stackName}`;
      
      if (region) {
        updateCommand += ` --region ${region}`;
      }
      
      if (templateBody) {
        // Create a temporary file for the template body
        const tempDir = await createTempDirectory('cf-template');
        const templateFile = await writeTempFile(tempDir, 'template.json', templateBody);
        updateCommand += ` --template-body file://${templateFile}`;
        
        try {
          const result = await execAsync(updateCommand);
          await cleanupTempDirectory(tempDir);
          return result;
        } catch (error) {
          await cleanupTempDirectory(tempDir);
          throw error;
        }
      } else if (templateUrl) {
        updateCommand += ` --template-url ${templateUrl}`;
      }
      
      // Handle parameters
      if (parameters && Object.keys(parameters).length > 0) {
        const parametersStr = Object.entries(parameters)
          .map(([key, value]) => `ParameterKey=${key},ParameterValue=${value}`)
          .join(' ');
        updateCommand += ` --parameters ${parametersStr}`;
      }
      
      // Handle capabilities
      if (capabilities && capabilities.length > 0) {
        updateCommand += ` --capabilities ${capabilities.join(' ')}`;
      }
      
      // Handle tags
      if (tags && Object.keys(tags).length > 0) {
        const tagsStr = Object.entries(tags)
          .map(([key, value]) => `Key=${key},Value=${value}`)
          .join(' ');
        updateCommand += ` --tags ${tagsStr}`;
      }
      
      return await execAsync(updateCommand);
      
    case 'delete':
      if (!stackName) {
        throw new Error('Stack name is required for delete operation');
      }
      
      let deleteCommand = `awslocal cloudformation delete-stack --stack-name ${stackName}`;
      
      if (region) {
        deleteCommand += ` --region ${region}`;
      }
      
      return await execAsync(deleteCommand);
      
    default:
      throw new Error(`Unsupported CloudFormation action: ${action}`);
  }
}
