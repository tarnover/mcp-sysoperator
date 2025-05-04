# Ansible MCP Server

A Model Context Protocol (MCP) server for Ansible automation. This server allows AI assistants to interact with Ansible, execute playbooks, manage inventory, and perform other Ansible operations directly.

## Features

- **Run Ansible Playbooks**: Execute Ansible playbooks with support for parameters like inventory, extra vars, tags, and limits
- **List Inventory**: View hosts and groups from an Ansible inventory file
- **Check Syntax**: Validate Ansible playbook syntax without execution
- **List Tasks**: Preview tasks that would be executed by a playbook

## Requirements

- Node.js 18 or higher
- npm or yarn
- Ansible installed and in PATH

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/your-username/mcp-ansible.git
cd mcp-ansible
```

### 2. Install dependencies

```bash
npm install
```

### 3. Build the server

```bash
npm run build
```

### 4. Configure MCP settings

Add the Ansible MCP server to your MCP settings configuration file.

For VSCode with Claude extension:
- Edit the file at `~/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`

For Claude Desktop app:
- macOS: Edit `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: Edit `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: Edit `~/.config/Claude/claude_desktop_config.json`

Add the following to the `mcpServers` section:

```json
{
  "mcpServers": {
    "ansible": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-ansible/build/index.js"],
      "env": {}
    }
  }
}
```

Make sure to replace `/absolute/path/to/mcp-ansible` with the actual path to your installation.

## Usage Examples

Once installed and configured, the MCP server provides the following tools to the AI assistant:

### 1. Run a Playbook

```
<use_mcp_tool>
<server_name>ansible</server_name>
<tool_name>run_playbook</tool_name>
<arguments>
{
  "playbook": "/path/to/your/playbook.yml",
  "inventory": "/path/to/inventory.ini",
  "extraVars": {
    "var1": "value1",
    "var2": "value2"
  },
  "tags": "setup,configure",
  "limit": "webservers"
}
</arguments>
</use_mcp_tool>
```

### 2. List Inventory

```
<use_mcp_tool>
<server_name>ansible</server_name>
<tool_name>list_inventory</tool_name>
<arguments>
{
  "inventory": "/path/to/inventory.ini"
}
</arguments>
</use_mcp_tool>
```

### 3. Check Playbook Syntax

```
<use_mcp_tool>
<server_name>ansible</server_name>
<tool_name>check_syntax</tool_name>
<arguments>
{
  "playbook": "/path/to/your/playbook.yml"
}
</arguments>
</use_mcp_tool>
```

### 4. List Tasks in a Playbook

```
<use_mcp_tool>
<server_name>ansible</server_name>
<tool_name>list_tasks</tool_name>
<arguments>
{
  "playbook": "/path/to/your/playbook.yml"
}
</arguments>
</use_mcp_tool>
```

### 5. Access Default Inventory Resource

```
<access_mcp_resource>
<server_name>ansible</server_name>
<uri>ansible://inventory/default</uri>
</access_mcp_resource>
```

## Development

### Project Structure

```
mcp-ansible/
├── src/
│   ├── index.ts                  # Main entry point
│   └── ansible-mcp-server/       
│       └── index.ts              # Ansible MCP server implementation
├── package.json                  # Project configuration and dependencies
├── tsconfig.json                 # TypeScript configuration
└── README.md                     # Documentation
```

### Adding New Features

To add new Ansible capabilities to the MCP server:

1. Modify `src/ansible-mcp-server/index.ts`
2. Add your new tool in the `setupToolHandlers` method
3. Implement a handler function for your tool
4. Rebuild with `npm run build`

## License

MIT License - See [LICENSE](LICENSE) for details
