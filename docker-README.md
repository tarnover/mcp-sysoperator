# SysOperator MCP Server Docker Image

This repository contains a Dockerfile for running the SysOperator MCP (Model Context Protocol) server in a Docker container. The SysOperator MCP server provides tools for infrastructure as code operations, including Ansible, AWS, and Terraform.

## Prerequisites

- Docker installed on your system
- Git (to clone the repository)

## Building and Running with the Helper Script

A helper script `docker-build-run.sh` is provided to simplify building and running the Docker container:

```bash
# Build the Docker image
./docker-build-run.sh --build

# Run the Docker container
./docker-build-run.sh --run

# Build and run in one command
./docker-build-run.sh --build --run

# Run with mounted playbooks directory and AWS credentials
./docker-build-run.sh --run --playbooks ./playbooks --aws

# Run with mounted Terraform directory
./docker-build-run.sh --run --terraform ./terraform

# Show help
./docker-build-run.sh --help
```

## Manual Building and Running

### Building the Docker Image

To manually build the Docker image, run the following command from the root directory of the repository:

```bash
docker build -t sysoperator-mcp .
```

### Running the Docker Container

The SysOperator MCP server is designed to communicate via stdin/stdout, so you need to run the container in interactive mode:

```bash
docker run -i sysoperator-mcp
```

### Mounting Volumes

For Ansible playbooks, inventory files, and other resources, you might want to mount volumes:

```bash
docker run -i -v /path/to/playbooks:/playbooks sysoperator-mcp
```

### AWS Credentials

For AWS operations, you need to provide AWS credentials. You can do this in several ways:

1. Using environment variables:

```bash
docker run -i \
  -e AWS_ACCESS_KEY_ID=your_key \
  -e AWS_SECRET_ACCESS_KEY=your_secret \
  sysoperator-mcp
```

2. Mounting your AWS credentials file:

```bash
docker run -i -v ~/.aws:/root/.aws sysoperator-mcp
```

### Terraform State

For Terraform operations, you might want to persist the Terraform state:

```bash
docker run -i -v /path/to/terraform/state:/terraform sysoperator-mcp
```

## Using Docker Compose

A `docker-compose.yml` file is provided for users who prefer Docker Compose:

```bash
# Build the image
docker-compose build

# Run the container
docker-compose up

# Run in detached mode
docker-compose up -d

# Stop the container
docker-compose down
```

Edit the `docker-compose.yml` file to customize volume mounts and environment variables according to your needs.

## Features

The Docker image includes:

- Node.js 18
- Ansible
- AWS CLI
- Terraform

## Customizing the Docker Image

If you need to customize the Docker image, you can modify the Dockerfile and rebuild the image. For example, you might want to:

- Install additional system dependencies
- Configure Ansible, AWS CLI, or Terraform
- Add custom scripts or configuration files

## Testing the MCP Server

A test script `docker-test.js` is provided to demonstrate how to interact with the SysOperator MCP server running in a Docker container:

```bash
# Method 1: Pipe the script to the Docker container
docker run -i sysoperator-mcp < docker-test.js

# Method 2: Use the helper script
./docker-build-run.sh --run | node docker-test.js
```

The test script sends a request to list available tools and then executes a simple ad-hoc command. You can modify this script to test other MCP server functionality.

## Troubleshooting

If you encounter issues with the Docker container, you can:

1. Check the container logs:

```bash
docker logs <container_id>
```

2. Run the container with a shell instead of the MCP server:

```bash
docker run -it --entrypoint /bin/bash sysoperator-mcp
```

This will give you a shell inside the container where you can troubleshoot issues.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
