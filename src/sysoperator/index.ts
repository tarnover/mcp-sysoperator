#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { existsSync, readFileSync } from 'fs';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

// Import common modules
import { VERSION } from './common/version.js';
import { 
  AnsibleError, 
  isAnsibleError, 
  formatAnsibleError,
  AnsibleNotInstalledError
} from './common/errors.js';
import { 
  RunPlaybookSchema, 
  ListInventorySchema, 
  CheckSyntaxSchema, 
  ListTasksSchema,
  RunAdHocSchema,
  VaultEncryptStringSchema,
  VaultDecryptStringSchema
} from './common/types.js';
import { verifyAnsibleInstalled } from './common/utils.js';

// Import operations
import * as playbooks from './operations/playbooks.js';
import * as inventory from './operations/inventory.js';
import * as adHoc from './operations/ad_hoc.js';
import * as vault from './operations/vault.js';
import * as aws from './operations/aws.js';
import * as terraform from './operations/terraform.js';

// Define a type for the tool handler functions
type ToolHandler = (args: any) => Promise<string>;

// Define the structure for tool definitions, including schema and handler
interface ToolDefinition {
  description: string;
  schema: z.ZodType<any, any>;
  handler: ToolHandler;
}

// Map tool names to their definitions (schema and handler)
const toolDefinitions: Record<string, ToolDefinition> = {
  run_playbook: {
    description: 'Run an Ansible playbook',
    schema: RunPlaybookSchema,
    handler: playbooks.runPlaybook,
  },
  list_inventory: {
    description: 'List Ansible inventory hosts and groups',
    schema: ListInventorySchema,
    handler: inventory.listInventory,
  },
  check_syntax: {
    description: 'Check syntax of an Ansible playbook without executing it',
    schema: CheckSyntaxSchema,
    handler: playbooks.checkSyntax,
  },
  list_tasks: {
    description: 'List all tasks that would be executed by a playbook',
    schema: ListTasksSchema,
    handler: playbooks.listTasks,
  },
  run_ad_hoc: {
    description: 'Run an Ansible ad-hoc command against specified hosts',
    schema: RunAdHocSchema,
    handler: adHoc.runAdHoc,
  },
  vault_encrypt_string: {
    description: 'Encrypt a string using Ansible Vault',
    schema: VaultEncryptStringSchema,
    handler: vault.encryptString,
  },
  vault_decrypt_string: {
    description: 'Decrypt a string encrypted with Ansible Vault',
    schema: VaultDecryptStringSchema,
    handler: vault.decryptString,
  },
  // AWS Tools
  aws_ec2: {
    description: 'Manage AWS EC2 instances (list, create, start, stop, terminate)',
    schema: aws.EC2InstanceSchema,
    handler: aws.ec2InstanceOperations,
  },
  aws_s3: {
    description: 'Manage AWS S3 buckets and objects',
    schema: aws.S3Schema,
    handler: aws.s3Operations,
  },
  aws_vpc: {
    description: 'Manage AWS VPC networks',
    schema: aws.VPCSchema,
    handler: aws.vpcOperations,
  },
  aws_cloudformation: {
    description: 'Manage AWS CloudFormation stacks',
    schema: aws.CloudFormationSchema,
    handler: aws.cloudFormationOperations,
  },
  aws_iam: {
    description: 'Manage AWS IAM roles and policies',
    schema: aws.IAMSchema,
    handler: aws.iamOperations,
  },
  aws_rds: {
    description: 'Manage AWS RDS database instances',
    schema: aws.RDSSchema,
    handler: aws.rdsOperations,
  },
  aws_route53: {
    description: 'Manage AWS Route53 DNS records and zones',
    schema: aws.Route53Schema,
    handler: aws.route53Operations,
  },
  aws_elb: {
    description: 'Manage AWS Elastic Load Balancers',
    schema: aws.ELBSchema,
    handler: aws.elbOperations,
  },
  aws_lambda: {
    description: 'Manage AWS Lambda functions',
    schema: aws.LambdaSchema,
    handler: aws.lambdaOperations,
  },
  aws_dynamic_inventory: {
    description: 'Create AWS dynamic inventory',
    schema: aws.DynamicInventorySchema,
    handler: aws.dynamicInventoryOperations,
  },
  // Terraform Tools
  terraform: {
    description: 'Execute Terraform commands (init, plan, apply, destroy, validate, output, etc.)',
    schema: terraform.TerraformSchema,
    handler: terraform.terraformOperations,
  },
};


class SysOperatorServer {
  private server: Server;
  // Use environment variable or fallback to default path
  private defaultInventoryPath: string = process.env.ANSIBLE_DEFAULT_INVENTORY || '/etc/ansible/hosts';

  constructor() {
    console.error(`Using default inventory path: ${this.defaultInventoryPath}`); // Log the path being used
    this.server = new Server(
      {
        name: 'sysoperator',
        version: VERSION,
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    this.setupResourceHandlers();
    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error: Error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupResourceHandlers() {
    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      const resources = [];
      
      // Only add default inventory resource if it exists
      if (existsSync(this.defaultInventoryPath)) {
        resources.push({
          uri: 'sysoperator://inventory/default',
          name: 'Default Ansible inventory',
          mimeType: 'text/plain',
          description: 'Default Ansible inventory file at /etc/ansible/hosts',
        });
      }
      
      return { resources };
    });

    // Read resources
    this.server.setRequestHandler(
      ReadResourceRequestSchema,
      async (request) => {
        // Handle default inventory resource
        if (request.params.uri === 'sysoperator://inventory/default') {
          try {
            if (!existsSync(this.defaultInventoryPath)) {
              throw new McpError(
                ErrorCode.InvalidRequest,
                'Default inventory file not found'
              );
            }
            
            const content = readFileSync(this.defaultInventoryPath, 'utf-8');
            return {
              contents: [
                {
                  uri: request.params.uri,
                  mimeType: 'text/plain',
                  text: content,
                },
              ],
            };
          } catch (error) {
            if (error instanceof McpError) {
              throw error;
            }
            throw new McpError(
              ErrorCode.InternalError,
              `Failed to read inventory: ${(error as Error).message}`
            );
          }
        }
        
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Unknown resource: ${request.params.uri}`
        );
      }
    );
  }

  private setupToolHandlers() {
    // List tools dynamically from the definitions map
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: Object.entries(toolDefinitions).map(([name, def]) => ({
        name: name,
        description: def.description,
        inputSchema: zodToJsonSchema(def.schema),
      })),
    }));

    // Handle tool calls using the definitions map
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const toolName = request.params.name;
        const toolDef = toolDefinitions[toolName];

        // Check if the tool exists in our map
        if (!toolDef) {
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${toolName}`
          );
        }

        // Validate arguments against the tool's schema
        const args = toolDef.schema.parse(request.params.arguments);
        
        // Execute the tool's handler function
        const result = await toolDef.handler(args);
        
        // Return the result
        return {
          content: [{ type: 'text', text: result }],
        };
      } catch (error) {
        // Handle Zod validation errors
        if (error instanceof z.ZodError) {
          return {
            content: [
              {
                type: 'text',
                text: `Invalid input: ${JSON.stringify(error.errors, null, 2)}`,
              },
            ],
            isError: true,
          };
        }

        // Handle Ansible errors
        if (isAnsibleError(error)) {
          const errorMessage = formatAnsibleError(error);
          return {
            content: [{ type: 'text', text: errorMessage }],
            isError: true,
          };
        }

        // Handle general errors
        if (error instanceof McpError) {
          throw error;
        }

        console.error('Unhandled error:', error);
        throw new McpError(
          ErrorCode.InternalError,
          `Internal server error: ${(error as Error).message}`
        );
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('MCP SysOperator server running on stdio');
  }
}

const server = new SysOperatorServer();
server.run().catch(console.error);
