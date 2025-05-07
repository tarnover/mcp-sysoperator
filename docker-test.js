#!/usr/bin/env node

/**
 * Test script for the SysOperator MCP server in Docker
 * 
 * This script demonstrates how to interact with the SysOperator MCP server
 * running in a Docker container. It sends a request to list available tools
 * and then executes a simple ad-hoc command.
 * 
 * Usage:
 *   1. Build and run the Docker container with stdin/stdout connected to this script:
 *      docker run -i sysoperator-mcp < docker-test.js
 *   
 *   2. Or use the helper script:
 *      ./docker-build-run.sh --run | node docker-test.js
 */

// MCP protocol message format
const formatMcpMessage = (method, params) => {
  const message = {
    jsonrpc: '2.0',
    id: Date.now().toString(),
    method,
    params
  };
  
  return JSON.stringify(message);
};

// Send a message to the MCP server
const sendMessage = (message) => {
  console.log(message);
};

// First, list the available tools
sendMessage(formatMcpMessage('mcp.list_tools', {}));

// Wait a moment before sending the next message
setTimeout(() => {
  // Then, run a simple ad-hoc command (echo hello)
  // Note: This will only work if Ansible is installed in the container
  sendMessage(formatMcpMessage('mcp.call_tool', {
    name: 'run_ad_hoc',
    arguments: {
      pattern: 'localhost',
      module: 'shell',
      args: 'echo "Hello from Docker container!"'
    }
  }));
}, 1000);

// In a real application, you would also read and parse the responses
// from the MCP server. This simple example just sends requests.
