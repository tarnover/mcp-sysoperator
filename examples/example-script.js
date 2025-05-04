#!/usr/bin/env node

/**
 * This is an example script demonstrating how a client might interact
 * with the Ansible MCP Server directly.
 * 
 * Prerequisites:
 * - Node.js installed
 * - MCP Ansible server configured
 * - Ansible installed
 */

import { McpClient } from '@modelcontextprotocol/sdk/client/index.js';
import { SubprocessClientTransport } from '@modelcontextprotocol/sdk/client/subprocess.js';

async function main() {
  // 1. Create client transport to communicate with the MCP server
  const transport = new SubprocessClientTransport({
    command: 'node',
    args: ['/path/to/mcp-ansible/build/index.js'],
    env: {}
  });

  // 2. Create MCP client
  const client = new McpClient();
  console.log('Connecting to Ansible MCP server...');
  await client.connect(transport);
  
  try {
    // 3. List available tools
    console.log('\n=== Available tools ===');
    const toolsResponse = await client.listTools();
    console.log(`Found ${toolsResponse.tools.length} tools:`);
    for (const tool of toolsResponse.tools) {
      console.log(`- ${tool.name}: ${tool.description}`);
    }
    
    // 4. Check if the default inventory resource is available
    console.log('\n=== Available resources ===');
    const resourcesResponse = await client.listResources();
    console.log(`Found ${resourcesResponse.resources.length} resources:`);
    for (const resource of resourcesResponse.resources) {
      console.log(`- ${resource.uri}: ${resource.name}`);
    }
    
    // 5. List inventory using the list_inventory tool
    console.log('\n=== Listing inventory ===');
    try {
      const inventoryResult = await client.callTool('list_inventory', {
        inventory: './examples/inventory.ini'
      });
      console.log(inventoryResult.content[0].text);
    } catch (error) {
      console.error('Error listing inventory:', error.message);
    }
    
    // 6. Check syntax of the example playbook
    console.log('\n=== Checking playbook syntax ===');
    try {
      const syntaxResult = await client.callTool('check_syntax', {
        playbook: './examples/playbook.yml'
      });
      console.log(syntaxResult.content[0].text);
    } catch (error) {
      console.error('Error checking syntax:', error.message);
    }
    
    // 7. List tasks in the example playbook
    console.log('\n=== Listing playbook tasks ===');
    try {
      const tasksResult = await client.callTool('list_tasks', {
        playbook: './examples/playbook.yml'
      });
      console.log(tasksResult.content[0].text);
    } catch (error) {
      console.error('Error listing tasks:', error.message);
    }
    
    // 8. Run the playbook with check mode (--check flag) to simulate
    console.log('\n=== Running playbook in check mode ===');
    try {
      const runResult = await client.callTool('run_playbook', {
        playbook: './examples/playbook.yml',
        inventory: './examples/inventory.ini',
        extraVars: {
          check_mode: true
        },
        tags: 'setup',
        limit: 'webservers'
      });
      console.log(runResult.content[0].text);
    } catch (error) {
      console.error('Error running playbook:', error.message);
    }
    
  } catch (error) {
    console.error('MCP Client error:', error);
  } finally {
    // 9. Close the connection
    await client.close();
    console.log('\nConnection closed.');
  }
}

main().catch(console.error);
