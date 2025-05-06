// LocalStack AWS Operations for MCP Ansible Server
// This script provides AWS operations using LocalStack instead of real AWS

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Helper function to execute shell commands
function runCommand(command) {
  console.log(`Executing: ${command}`);
  try {
    const output = execSync(command, { encoding: 'utf8' });
    return output;
  } catch (error) {
    console.error(`Error executing command: ${error.message}`);
    if (error.stderr) console.error(error.stderr);
    throw error;
  }
}

// Create a temporary directory
function createTempDir(prefix = 'localstack-aws-') {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  console.log(`Created temporary directory: ${tempDir}`);
  return tempDir;
}

// Clean up temporary directory
function cleanupTempDir(tempDir) {
  if (tempDir && fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log(`Removed temporary directory: ${tempDir}`);
  }
}

// Write content to a file in the temporary directory
function writeTempFile(tempDir, filename, content) {
  const filePath = path.join(tempDir, filename);
  fs.writeFileSync(filePath, content);
  return filePath;
}

// S3 Operations
function s3Operations(action, params = {}) {
  const { region, bucket, objectKey, localPath } = params;
  
  switch (action) {
    case 'list_buckets':
      return runCommand('awslocal s3 ls');
      
    case 'create_bucket':
      return runCommand(`awslocal s3 mb s3://${bucket}`);
      
    case 'delete_bucket':
      return runCommand(`awslocal s3 rb s3://${bucket} --force`);
      
    case 'list_objects':
      return runCommand(`awslocal s3 ls s3://${bucket}`);
      
    case 'upload':
      return runCommand(`awslocal s3 cp ${localPath} s3://${bucket}/${objectKey}`);
      
    case 'download':
      return runCommand(`awslocal s3 cp s3://${bucket}/${objectKey} ${localPath}`);
      
    default:
      throw new Error(`Unsupported S3 action: ${action}`);
  }
}

// EC2 Operations
function ec2Operations(action, params = {}) {
  const { region, instanceIds, instanceType, imageId, keyName } = params;
  
  switch (action) {
    case 'list':
      return runCommand('awslocal ec2 describe-instances');
      
    case 'create':
      return runCommand(`awslocal ec2 run-instances --image-id ${imageId || 'ami-12345678'} --instance-type ${instanceType || 't2.micro'} --key-name ${keyName || 'default-key'}`);
      
    case 'terminate':
      if (!instanceIds || instanceIds.length === 0) {
        throw new Error('Instance IDs are required for terminate action');
      }
      return runCommand(`awslocal ec2 terminate-instances --instance-ids ${instanceIds.join(' ')}`);
      
    case 'start':
      if (!instanceIds || instanceIds.length === 0) {
        throw new Error('Instance IDs are required for start action');
      }
      return runCommand(`awslocal ec2 start-instances --instance-ids ${instanceIds.join(' ')}`);
      
    case 'stop':
      if (!instanceIds || instanceIds.length === 0) {
        throw new Error('Instance IDs are required for stop action');
      }
      return runCommand(`awslocal ec2 stop-instances --instance-ids ${instanceIds.join(' ')}`);
      
    default:
      throw new Error(`Unsupported EC2 action: ${action}`);
  }
}

// CloudFormation Operations
function cloudFormationOperations(action, params = {}) {
  const { region, stackName, templateBody, templateUrl } = params;
  let tempDir = null;
  
  try {
    switch (action) {
      case 'list':
        return runCommand('awslocal cloudformation list-stacks');
        
      case 'create':
      case 'update':
        tempDir = createTempDir('cf-');
        let templatePath;
        
        if (templateBody) {
          templatePath = writeTempFile(tempDir, 'template.json', templateBody);
        } else if (templateUrl) {
          // For simplicity, we're not handling remote templates in this example
          throw new Error('Template URL not supported in this example');
        } else {
          throw new Error('Either templateBody or templateUrl must be provided');
        }
        
        return runCommand(`awslocal cloudformation ${action === 'create' ? 'create-stack' : 'update-stack'} --stack-name ${stackName} --template-body file://${templatePath}`);
        
      case 'delete':
        return runCommand(`awslocal cloudformation delete-stack --stack-name ${stackName}`);
        
      default:
        throw new Error(`Unsupported CloudFormation action: ${action}`);
    }
  } finally {
    if (tempDir) {
      cleanupTempDir(tempDir);
    }
  }
}

// Main function to run AWS operations with LocalStack
function runAwsOperation(service, action, params = {}) {
  console.log(`Running ${service} ${action} operation with LocalStack`);
  
  switch (service) {
    case 's3':
      return s3Operations(action, params);
      
    case 'ec2':
      return ec2Operations(action, params);
      
    case 'cloudformation':
      return cloudFormationOperations(action, params);
      
    default:
      throw new Error(`Unsupported service: ${service}`);
  }
}

// Example usage
function runExamples() {
  try {
    // List S3 buckets
    console.log("\nListing S3 buckets:");
    const buckets = runAwsOperation('s3', 'list_buckets');
    console.log(buckets);
    
    // Create a bucket
    console.log("\nCreating S3 bucket:");
    const createBucket = runAwsOperation('s3', 'create_bucket', { bucket: 'test-bucket' });
    console.log(createBucket);
    
    // List EC2 instances
    console.log("\nListing EC2 instances:");
    const instances = runAwsOperation('ec2', 'list');
    console.log(instances);
    
    // Create CloudFormation stack
    console.log("\nCreating CloudFormation stack:");
    const templateBody = JSON.stringify({
      "Resources": {
        "MyBucket": {
          "Type": "AWS::S3::Bucket",
          "Properties": {
            "BucketName": "cf-created-bucket"
          }
        }
      }
    });
    
    const createStack = runAwsOperation('cloudformation', 'create', { 
      stackName: 'test-stack', 
      templateBody 
    });
    console.log(createStack);
    
    console.log("\nAll examples completed successfully!");
  } catch (error) {
    console.error("Error running examples:", error);
  }
}

// Export functions for use in other modules
module.exports = {
  runAwsOperation,
  s3Operations,
  ec2Operations,
  cloudFormationOperations
};

// If this script is run directly, execute the examples
if (require.main === module) {
  runExamples();
}
