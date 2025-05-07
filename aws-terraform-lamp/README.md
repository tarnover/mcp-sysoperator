# AWS LAMP Stack Infrastructure

A secure, scalable, and highly available LAMP (Linux, Apache, MySQL, PHP) stack infrastructure on AWS using Terraform for infrastructure provisioning and Ansible for configuration management.

## Architecture

```mermaid
graph TB
    %% Main components
    Client((Client)) --> Route53
    Route53[Route53 DNS] --> WAF
    WAF[AWS WAF] --> ALB
    ALB[Application Load Balancer] --> ASG
    
    %% Auto Scaling Group and EC2
    subgraph Compute
        ASG[Auto Scaling Group]
        ASG --> EC2_1[EC2 Instance 1]
        ASG --> EC2_2[EC2 Instance 2]
        ASG --> EC2_N[EC2 Instance N...]
    end
    
    %% Shared Resources
    EC2_1 --> EFS
    EC2_2 --> EFS
    EC2_N --> EFS
    EFS[Amazon EFS\nShared Storage]
    
    EC2_1 --> RDS
    EC2_2 --> RDS
    EC2_N --> RDS
    
    %% Database
    subgraph Database
        RDS[Amazon RDS MySQL\nMulti-AZ]
    end
    
    %% Networking
    subgraph VPC
        subgraph PublicSubnets[Public Subnets]
            IGW[Internet Gateway]
            NAT[NAT Gateway]
            ALB
        end
        
        subgraph PrivateSubnets[Private Subnets]
            EC2_1
            EC2_2
            EC2_N
            EFS
        end
        
        subgraph DatabaseSubnets[Database Subnets]
            RDS
        end
    end
    
    %% Security
    SG_ALB[Security Group\nALB]
    SG_WEB[Security Group\nWeb Servers]
    SG_EFS[Security Group\nEFS]
    SG_DB[Security Group\nDatabase]
    
    ALB --> SG_ALB
    EC2_1 --> SG_WEB
    EC2_2 --> SG_WEB
    EC2_N --> SG_WEB
    EFS --> SG_EFS
    RDS --> SG_DB
    
    %% Monitoring & Management
    subgraph Monitoring
        CW[CloudWatch]
        CT[CloudTrail]
        LOGS[CloudWatch Logs]
        ALARMS[CloudWatch Alarms]
    end
    
    EC2_1 -.-> CW
    EC2_2 -.-> CW
    EC2_N -.-> CW
    RDS -.-> CW
    ALB -.-> CW
    EFS -.-> CW
    
    %% IAM & Permissions
    IAM[IAM Roles\nand Profiles]
    EC2_1 -.-> IAM
    EC2_2 -.-> IAM
    EC2_N -.-> IAM

    %% Traffic Flow
    Client --> Internet((Internet))
    Internet --> Route53
    
    %% Styling
    style VPC fill:#e4f5f7,stroke:#099,stroke-width:1px
    style PublicSubnets fill:#c9ebef,stroke:#099,stroke-dasharray:5 5
    style PrivateSubnets fill:#c9ebef,stroke:#099,stroke-dasharray:5 5
    style DatabaseSubnets fill:#c9ebef,stroke:#099,stroke-dasharray:5 5
    style Compute fill:#f4e8d9,stroke:#d67b00,stroke-width:1px
    style Database fill:#e6d6e8,stroke:#9a3ca0,stroke-width:1px
    style Monitoring fill:#d7e8d5,stroke:#38761d,stroke-width:1px
    
    classDef default fill:#ddf,stroke:#33a,stroke-width:1px
    class Client,Internet none
```

This project implements a complete LAMP stack with the following components:

### Core Components

- Apache web servers running on Amazon Linux 2 in an Auto Scaling Group (ASG)
- PHP and MySQL client installed via Ansible
- Amazon RDS (MySQL) for the database backend
- EFS (Elastic File System) mounted to each web server instance
- Application Load Balancer (ALB) distributing traffic across the web servers

### Networking & DNS

- VPC with public and private subnets across multiple Availability Zones
- Internet Gateway and NAT Gateway
- Route53 hosted zone with DNS records pointing to the ALB

### Security & Monitoring

- AWS WAF attached to the ALB to filter traffic
- IAM roles with least-privilege access for EC2, EFS, and RDS usage
- AWS CloudTrail enabled for audit logging
- CloudWatch Logs enabled for EC2 and RDS monitoring
- Security Groups and NACLs configured for least-privilege access

### High Availability

- Deployment across multiple AZs
- Health checks on ALB
- Auto-scaling policies based on CPU and memory utilization

## Project Structure

```
aws-terraform-lamp/
├── terraform/                  # Terraform infrastructure code
│   ├── modules/                # Modular Terraform components
│   │   ├── networking/         # VPC, subnets, NAT, IGW
│   │   ├── security/           # Security groups, IAM roles
│   │   ├── storage/            # EFS configuration
│   │   ├── database/           # RDS configuration
│   │   ├── compute/            # EC2, ASG configuration
│   │   ├── loadbalancing/      # ALB configuration
│   │   ├── dns/                # Route53 configuration
│   │   ├── waf/                # WAF configuration
│   │   └── monitoring/         # CloudWatch, CloudTrail configuration
│   ├── main.tf                 # Main Terraform configuration
│   ├── variables.tf            # Input variables
│   ├── outputs.tf              # Output values
│   └── terraform.tfvars        # Variable values
├── ansible/                    # Ansible configuration code
│   ├── roles/                  # Ansible roles
│   │   ├── common/             # Common server configuration
│   │   ├── web/                # Apache and PHP configuration
│   │   ├── efs_client/         # EFS mount configuration
│   │   ├── db_client/          # MySQL client configuration
│   │   └── app/                # Application deployment
│   ├── inventory/              # Inventory files
│   │   ├── aws_ec2.yml         # Dynamic AWS inventory
│   │   └── localstack.yml      # LocalStack inventory for testing
│   ├── group_vars/             # Group variables
│   │   ├── all.yml             # Variables for all hosts
│   │   └── web_servers.yml     # Variables for web servers
│   ├── site.yml                # Main playbook
│   └── ansible.cfg             # Ansible configuration
├── deploy_to_aws.sh            # Deployment script
├── test_with_localstack.sh     # Testing script with LocalStack
└── cleanup_aws.sh              # Resource cleanup script
```

## Prerequisites

- AWS CLI configured with appropriate credentials
- Terraform >= 1.0.0
- Ansible >= 2.9.0
- LocalStack (for local testing)
- jq (for JSON processing)

## Usage

### Local Testing with LocalStack

To test the infrastructure locally using LocalStack:

```bash
# Start LocalStack
localstack start

# Run the test script
./test_with_localstack.sh
```

### Deploying to AWS

To deploy the infrastructure to AWS:

```bash
# Set AWS credentials
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_REGION="us-west-2"

# Run the deployment script
./deploy_to_aws.sh
```

### Cleaning Up Resources

To clean up all AWS resources created by this project:

```bash
# Set AWS credentials (if not already set)
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_REGION="us-west-2"

# Run the cleanup script
./cleanup_aws.sh
```

## Customization

### Terraform Variables

Edit `terraform/terraform.tfvars` to customize the infrastructure:

```hcl
# Example customization
aws_region     = "us-east-1"
vpc_cidr       = "10.0.0.0/16"
instance_type  = "t3.small"
rds_instance_class = "db.t3.small"
domain_name    = "example.com"
```

### Ansible Variables

Edit files in `ansible/group_vars/` to customize the configuration:

```yaml
# Example customization in group_vars/all.yml
environment: production
timezone: America/New_York
php_memory_limit: 256M
```

## Security Features

- All data in transit is encrypted using TLS
- All data at rest is encrypted using AWS KMS
- Web Application Firewall (WAF) protects against common web exploits
- Security groups follow the principle of least privilege
- IAM roles are scoped to minimum required permissions
- SSH access is restricted and password authentication is disabled
- CloudTrail logs all API calls for audit purposes

## Monitoring and Logging

- CloudWatch Logs collect and centralize logs from EC2 instances
- CloudWatch Alarms monitor resource utilization and trigger scaling
- CloudTrail logs all API calls for audit and compliance
- Health checks ensure services are functioning properly

## License

This project is licensed under the MIT License - see the LICENSE file for details.
