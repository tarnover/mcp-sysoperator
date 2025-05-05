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

class AnsibleMcpServer {
  private server: Server;
  private defaultInventoryPath: string = '/etc/ansible/hosts';

  constructor() {
    this.server = new Server(
      {
        name: 'ansible-mcp-server',
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
          uri: 'ansible://inventory/default',
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
        if (request.params.uri === 'ansible://inventory/default') {
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
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'run_playbook',
          description: 'Run an Ansible playbook',
          inputSchema: zodToJsonSchema(RunPlaybookSchema),
        },
        {
          name: 'list_inventory',
          description: 'List Ansible inventory hosts and groups',
          inputSchema: zodToJsonSchema(ListInventorySchema),
        },
        {
          name: 'check_syntax',
          description: 'Check syntax of an Ansible playbook without executing it',
          inputSchema: zodToJsonSchema(CheckSyntaxSchema),
        },
        {
          name: 'list_tasks',
          description: 'List all tasks that would be executed by a playbook',
          inputSchema: zodToJsonSchema(ListTasksSchema),
        },
        {
          name: 'run_ad_hoc',
          description: 'Run an Ansible ad-hoc command against specified hosts',
          inputSchema: zodToJsonSchema(RunAdHocSchema),
        },
        {
          name: 'vault_encrypt_string',
          description: 'Encrypt a string using Ansible Vault',
          inputSchema: zodToJsonSchema(VaultEncryptStringSchema),
        },
        {
          name: 'vault_decrypt_string',
          description: 'Decrypt a string encrypted with Ansible Vault',
          inputSchema: zodToJsonSchema(VaultDecryptStringSchema),
        },
        // AWS Tools
        {
          name: 'aws_ec2',
          description: 'Manage AWS EC2 instances (list, create, start, stop, terminate)',
          inputSchema: zodToJsonSchema(aws.EC2InstanceSchema),
        },
        {
          name: 'aws_s3',
          description: 'Manage AWS S3 buckets and objects',
          inputSchema: zodToJsonSchema(aws.S3Schema),
        },
        {
          name: 'aws_vpc',
          description: 'Manage AWS VPC networks',
          inputSchema: zodToJsonSchema(aws.VPCSchema),
        },
        {
          name: 'aws_cloudformation',
          description: 'Manage AWS CloudFormation stacks',
          inputSchema: zodToJsonSchema(aws.CloudFormationSchema),
        },
        {
          name: 'aws_iam',
          description: 'Manage AWS IAM roles and policies',
          inputSchema: zodToJsonSchema(aws.IAMSchema),
        },
        {
          name: 'aws_rds',
          description: 'Manage AWS RDS database instances',
          inputSchema: zodToJsonSchema(aws.RDSSchema),
        },
        {
          name: 'aws_route53',
          description: 'Manage AWS Route53 DNS records and zones',
          inputSchema: zodToJsonSchema(aws.Route53Schema),
        },
        {
          name: 'aws_elb',
          description: 'Manage AWS Elastic Load Balancers',
          inputSchema: zodToJsonSchema(aws.ELBSchema),
        },
        {
          name: 'aws_lambda',
          description: 'Manage AWS Lambda functions',
          inputSchema: zodToJsonSchema(aws.LambdaSchema),
        },
        {
          name: 'aws_dynamic_inventory',
          description: 'Create AWS dynamic inventory',
          inputSchema: zodToJsonSchema(aws.DynamicInventorySchema),
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        // First verify Ansible is installed
        await verifyAnsibleInstalled();

        switch (request.params.name) {
          case 'run_playbook': {
            const args = RunPlaybookSchema.parse(request.params.arguments);
            const result = await playbooks.runPlaybook(args);
            return {
              content: [{ type: 'text', text: result }],
            };
          }

          case 'list_inventory': {
            const args = ListInventorySchema.parse(request.params.arguments);
            const result = await inventory.listInventory(args);
            return {
              content: [{ type: 'text', text: result }],
            };
          }

          case 'check_syntax': {
            const args = CheckSyntaxSchema.parse(request.params.arguments);
            const result = await playbooks.checkSyntax(args);
            return {
              content: [{ type: 'text', text: result }],
            };
          }

          case 'list_tasks': {
            const args = ListTasksSchema.parse(request.params.arguments);
            const result = await playbooks.listTasks(args);
            return {
              content: [{ type: 'text', text: result }],
            };
          }
          
          case 'run_ad_hoc': {
            const args = RunAdHocSchema.parse(request.params.arguments);
            const result = await adHoc.runAdHoc(args);
            return {
              content: [{ type: 'text', text: result }],
            };
          }
          
          case 'vault_encrypt_string': {
            const args = VaultEncryptStringSchema.parse(request.params.arguments);
            const result = await vault.encryptString(args);
            return {
              content: [{ type: 'text', text: result }],
            };
          }
          
          case 'vault_decrypt_string': {
            const args = VaultDecryptStringSchema.parse(request.params.arguments);
            const result = await vault.decryptString(args);
            return {
              content: [{ type: 'text', text: result }],
            };
          }
          
          // AWS Operations
          case 'aws_ec2': {
            const args = aws.EC2InstanceSchema.parse(request.params.arguments);
            const result = await aws.ec2InstanceOperations(args);
            return {
              content: [{ type: 'text', text: result }],
            };
          }
          
          case 'aws_s3': {
            const args = aws.S3Schema.parse(request.params.arguments);
            const result = await aws.s3Operations(args);
            return {
              content: [{ type: 'text', text: result }],
            };
          }
          
          case 'aws_vpc': {
            const args = aws.VPCSchema.parse(request.params.arguments);
            const result = await aws.vpcOperations(args);
            return {
              content: [{ type: 'text', text: result }],
            };
          }
          
          case 'aws_cloudformation': {
            const args = aws.CloudFormationSchema.parse(request.params.arguments);
            const result = await aws.cloudFormationOperations(args);
            return {
              content: [{ type: 'text', text: result }],
            };
          }
          
          case 'aws_iam': {
            const args = aws.IAMSchema.parse(request.params.arguments);
            const result = await aws.iamOperations(args);
            return {
              content: [{ type: 'text', text: result }],
            };
          }
          
          case 'aws_rds': {
            const args = aws.RDSSchema.parse(request.params.arguments);
            const result = await aws.rdsOperations(args);
            return {
              content: [{ type: 'text', text: result }],
            };
          }
          
          case 'aws_route53': {
            const args = aws.Route53Schema.parse(request.params.arguments);
            const result = await aws.route53Operations(args);
            return {
              content: [{ type: 'text', text: result }],
            };
          }
          
          case 'aws_elb': {
            const args = aws.ELBSchema.parse(request.params.arguments);
            const result = await aws.elbOperations(args);
            return {
              content: [{ type: 'text', text: result }],
            };
          }
          
          case 'aws_lambda': {
            const args = aws.LambdaSchema.parse(request.params.arguments);
            const result = await aws.lambdaOperations(args);
            return {
              content: [{ type: 'text', text: result }],
            };
          }
          
          case 'aws_dynamic_inventory': {
            const args = aws.DynamicInventorySchema.parse(request.params.arguments);
            const result = await aws.dynamicInventoryOperations(args);
            return {
              content: [{ type: 'text', text: result }],
            };
          }

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
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
    console.error('Ansible MCP server running on stdio');
  }
}

const server = new AnsibleMcpServer();
server.run().catch(console.error);
