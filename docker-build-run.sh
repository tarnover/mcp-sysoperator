#!/bin/bash

# Script to build and run the SysOperator MCP server Docker container

# Function to display usage information
function show_usage {
  echo "Usage: $0 [options]"
  echo "Options:"
  echo "  --build          Build the Docker image"
  echo "  --run            Run the Docker container"
  echo "  --playbooks DIR  Mount the specified directory as /playbooks in the container"
  echo "  --aws            Mount local AWS credentials to the container"
  echo "  --terraform DIR  Mount the specified directory as /terraform in the container"
  echo "  --help           Display this help message"
  echo ""
  echo "Examples:"
  echo "  $0 --build                   # Build the Docker image"
  echo "  $0 --run                     # Run the Docker container"
  echo "  $0 --build --run             # Build and run the Docker container"
  echo "  $0 --run --playbooks ./playbooks --aws  # Run with playbooks and AWS credentials"
}

# Default values
BUILD=false
RUN=false
PLAYBOOKS_DIR=""
AWS_CREDS=false
TERRAFORM_DIR=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --build)
      BUILD=true
      shift
      ;;
    --run)
      RUN=true
      shift
      ;;
    --playbooks)
      PLAYBOOKS_DIR="$2"
      shift 2
      ;;
    --aws)
      AWS_CREDS=true
      shift
      ;;
    --terraform)
      TERRAFORM_DIR="$2"
      shift 2
      ;;
    --help)
      show_usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      show_usage
      exit 1
      ;;
  esac
done

# Check if at least one action is specified
if [[ "$BUILD" == "false" && "$RUN" == "false" ]]; then
  echo "Error: No action specified. Use --build, --run, or both."
  show_usage
  exit 1
fi

# Build the Docker image if requested
if [[ "$BUILD" == "true" ]]; then
  echo "Building Docker image..."
  docker build -t sysoperator-mcp .
  
  if [[ $? -ne 0 ]]; then
    echo "Error: Docker build failed."
    exit 1
  fi
  
  echo "Docker image built successfully."
fi

# Run the Docker container if requested
if [[ "$RUN" == "true" ]]; then
  # Prepare the Docker run command
  CMD="docker run -i"
  
  # Add volume mounts if specified
  if [[ -n "$PLAYBOOKS_DIR" ]]; then
    if [[ ! -d "$PLAYBOOKS_DIR" ]]; then
      echo "Error: Playbooks directory '$PLAYBOOKS_DIR' does not exist."
      exit 1
    fi
    CMD="$CMD -v $(realpath $PLAYBOOKS_DIR):/playbooks"
  fi
  
  # Add AWS credentials if requested
  if [[ "$AWS_CREDS" == "true" ]]; then
    if [[ ! -d "$HOME/.aws" ]]; then
      echo "Warning: AWS credentials directory '$HOME/.aws' does not exist."
    else
      CMD="$CMD -v $HOME/.aws:/root/.aws"
    fi
  fi
  
  # Add Terraform directory if specified
  if [[ -n "$TERRAFORM_DIR" ]]; then
    if [[ ! -d "$TERRAFORM_DIR" ]]; then
      echo "Error: Terraform directory '$TERRAFORM_DIR' does not exist."
      exit 1
    fi
    CMD="$CMD -v $(realpath $TERRAFORM_DIR):/terraform"
  fi
  
  # Add the image name to the command
  CMD="$CMD sysoperator-mcp"
  
  echo "Running Docker container..."
  echo "Command: $CMD"
  
  # Execute the Docker run command
  eval $CMD
fi
