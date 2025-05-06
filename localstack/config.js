/**
 * Configuration for LocalStack integration
 * This file provides configuration options for using LocalStack with the MCP Ansible server
 */

module.exports = {
  /**
   * Whether to use LocalStack instead of real AWS
   * Set to true to use LocalStack, false to use real AWS
   */
  useLocalStack: true,
  
  /**
   * LocalStack endpoint URL
   * Default: http://localhost:4566
   */
  localStackEndpoint: 'http://localhost:4566',
  
  /**
   * AWS region to use with LocalStack
   * Default: us-east-1
   */
  region: 'us-east-1',
  
  /**
   * Whether to verify SSL certificates when connecting to LocalStack
   * Default: false
   */
  verifySSL: false,
  
  /**
   * Whether to log commands executed with LocalStack
   * Default: true
   */
  logCommands: true,
  
  /**
   * Path to the awslocal CLI
   * Default: awslocal (assumes it's in PATH)
   */
  awslocalPath: 'awslocal',
  
  /**
   * Path to the localstack CLI
   * Default: localstack (assumes it's in PATH)
   */
  localstackPath: 'localstack'
};
