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
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';

const execAsync = promisify(exec);

// Validation utilities
const isString = (value: any): value is string => 
  typeof value === 'string';

const isValidPlaybookArgs = (
  args: any
): args is { playbook: string; extraVars?: Record<string, any>; inventory?: string; tags?: string; limit?: string } =>
  typeof args === 'object' &&
  args !== null &&
  isString(args.playbook) &&
  (args.extraVars === undefined || typeof args.extraVars === 'object') &&
  (args.inventory === undefined || isString(args.inventory)) &&
  (args.tags === undefined || isString(args.tags)) &&
  (args.limit === undefined || isString(args.limit));

const isValidInventoryArgs = (
  args: any
): args is { inventory?: string } =>
  typeof args === 'object' &&
  args !== null &&
  (args.inventory === undefined || isString(args.inventory));

const isValidSyntaxCheckArgs = (
  args: any
): args is { playbook: string } =>
  typeof args === 'object' &&
  args !== null &&
  isString(args.playbook);

const isValidListTasksArgs = (
  args: any
): args is { playbook: string } =>
  typeof args === 'object' &&
  args !== null &&
  isString(args.playbook);

class AnsibleMcpServer {
  private server: Server;
  private defaultInventoryPath: string = '/etc/ansible/hosts';

  constructor() {
    this.server = new Server(
      {
        name: 'ansible-mcp-server',
        version: '0.1.0',
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
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private async checkAnsibleInstalled(): Promise<boolean> {
    try {
      await execAsync('ansible --version');
      return true;
    } catch (error) {
      return false;
    }
  }

  private validatePlaybookPath(path: string): string {
    // Resolve relative paths to absolute
    const absolutePath = resolve(path);
    if (!existsSync(absolutePath)) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Playbook not found: ${path}`
      );
    }
    return absolutePath;
  }

  private validateInventoryPath(path?: string): string | undefined {
    if (!path) return undefined;
    
    // Resolve relative paths to absolute
    const absolutePath = resolve(path);
    if (!existsSync(absolutePath)) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Inventory not found: ${path}`
      );
    }
    return absolutePath;
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
                ErrorCode.ResourceNotFound,
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
          ErrorCode.ResourceNotFound,
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
          inputSchema: {
            type: 'object',
            properties: {
              playbook: {
                type: 'string',
                description: 'Path to the playbook file (YAML)',
              },
              extraVars: {
                type: 'object',
                description: 'Extra variables to pass to ansible-playbook (--extra-vars)',
              },
              inventory: {
                type: 'string',
                description: 'Path to inventory file or string (--inventory)',
              },
              tags: {
                type: 'string',
                description: 'Only run plays and tasks tagged with these values (--tags)',
              },
              limit: {
                type: 'string',
                description: 'Limit execution to specified hosts or groups (--limit)',
              }
            },
            required: ['playbook'],
          },
        },
        {
          name: 'list_inventory',
          description: 'List Ansible inventory hosts and groups',
          inputSchema: {
            type: 'object',
            properties: {
              inventory: {
                type: 'string',
                description: 'Path to inventory file or string (--inventory)',
              },
            },
            required: [],
          },
        },
        {
          name: 'check_syntax',
          description: 'Check syntax of an Ansible playbook without executing it',
          inputSchema: {
            type: 'object',
            properties: {
              playbook: {
                type: 'string',
                description: 'Path to the playbook file (YAML)',
              },
            },
            required: ['playbook'],
          },
        },
        {
          name: 'list_tasks',
          description: 'List all tasks that would be executed by a playbook',
          inputSchema: {
            type: 'object',
            properties: {
              playbook: {
                type: 'string',
                description: 'Path to the playbook file (YAML)',
              },
            },
            required: ['playbook'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      // First check if Ansible is installed
      const ansibleInstalled = await this.checkAnsibleInstalled();
      if (!ansibleInstalled) {
        return {
          content: [
            {
              type: 'text',
              text: 'Ansible is not installed or not found in PATH. Please install Ansible first.',
            },
          ],
          isError: true,
        };
      }

      switch (request.params.name) {
        case 'run_playbook':
          return this.handleRunPlaybook(request.params.arguments);
        case 'list_inventory':
          return this.handleListInventory(request.params.arguments);
        case 'check_syntax':
          return this.handleCheckSyntax(request.params.arguments);
        case 'list_tasks':
          return this.handleListTasks(request.params.arguments);
        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${request.params.name}`
          );
      }
    });
  }

  private async handleRunPlaybook(args: unknown) {
    if (!isValidPlaybookArgs(args)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Invalid playbook arguments'
      );
    }

    try {
      const playbookPath = this.validatePlaybookPath(args.playbook);
      const inventoryPath = this.validateInventoryPath(args.inventory);
      
      // Build command
      let command = `ansible-playbook ${playbookPath}`;
      
      // Add inventory if specified
      if (inventoryPath) {
        command += ` -i ${inventoryPath}`;
      }
      
      // Add extra vars if specified
      if (args.extraVars && Object.keys(args.extraVars).length > 0) {
        const extraVarsJson = JSON.stringify(args.extraVars);
        command += ` --extra-vars '${extraVarsJson}'`;
      }
      
      // Add tags if specified
      if (args.tags) {
        command += ` --tags "${args.tags}"`;
      }
      
      // Add limit if specified
      if (args.limit) {
        command += ` --limit "${args.limit}"`;
      }

      // Execute command
      const { stdout, stderr } = await execAsync(command);
      
      // Return the result
      return {
        content: [
          {
            type: 'text',
            text: stdout || 'Playbook executed successfully (no output)',
          },
        ],
      };
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      
      // Handle exec error
      const execError = error as { stderr?: string; message: string };
      return {
        content: [
          {
            type: 'text',
            text: `Error running playbook: ${execError.stderr || execError.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleListInventory(args: unknown) {
    if (!isValidInventoryArgs(args)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Invalid inventory arguments'
      );
    }

    try {
      const inventoryPath = this.validateInventoryPath(args.inventory);
      
      // Build command
      let command = 'ansible-inventory';
      
      // Add inventory if specified
      if (inventoryPath) {
        command += ` -i ${inventoryPath}`;
      }
      
      command += ' --list';

      // Execute command
      const { stdout, stderr } = await execAsync(command);
      
      try {
        // Try to parse as JSON for better formatting
        const inventory = JSON.parse(stdout);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(inventory, null, 2),
            },
          ],
        };
      } catch {
        // Fall back to raw output if can't parse as JSON
        return {
          content: [
            {
              type: 'text',
              text: stdout || 'No inventory data returned',
            },
          ],
        };
      }
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      
      // Handle exec error
      const execError = error as { stderr?: string; message: string };
      return {
        content: [
          {
            type: 'text',
            text: `Error listing inventory: ${execError.stderr || execError.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleCheckSyntax(args: unknown) {
    if (!isValidSyntaxCheckArgs(args)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Invalid syntax check arguments'
      );
    }

    try {
      const playbookPath = this.validatePlaybookPath(args.playbook);
      
      // Build command with syntax-check option
      const command = `ansible-playbook ${playbookPath} --syntax-check`;

      // Execute command
      const { stdout, stderr } = await execAsync(command);
      
      return {
        content: [
          {
            type: 'text',
            text: stdout || 'Syntax check passed (no issues found)',
          },
        ],
      };
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      
      // Handle exec error - in this case, a syntax error
      const execError = error as { stderr?: string; message: string };
      return {
        content: [
          {
            type: 'text',
            text: `Syntax error: ${execError.stderr || execError.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleListTasks(args: unknown) {
    if (!isValidListTasksArgs(args)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Invalid list tasks arguments'
      );
    }

    try {
      const playbookPath = this.validatePlaybookPath(args.playbook);
      
      // Build command with list-tasks option
      const command = `ansible-playbook ${playbookPath} --list-tasks`;

      // Execute command
      const { stdout, stderr } = await execAsync(command);
      
      return {
        content: [
          {
            type: 'text',
            text: stdout || 'No tasks found in playbook',
          },
        ],
      };
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      
      // Handle exec error
      const execError = error as { stderr?: string; message: string };
      return {
        content: [
          {
            type: 'text',
            text: `Error listing tasks: ${execError.stderr || execError.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Ansible MCP server running on stdio');
  }
}

const server = new AnsibleMcpServer();
server.run().catch(console.error);
