# Compute Module
# Creates Auto Scaling Group and Launch Template for EC2 instances

# Get the latest Amazon Linux 2 AMI
data "aws_ami" "amazon_linux_2" {
  most_recent = true
  owners      = ["amazon"]
  
  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }
  
  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# User data script for EC2 instances
locals {
  user_data = <<-EOF
#!/bin/bash
# Update system packages
yum update -y

# Install Apache, PHP, and other required packages
yum install -y httpd php php-mysqlnd amazon-efs-utils

# Start and enable Apache
systemctl start httpd
systemctl enable httpd

# Create EFS mount point
mkdir -p ${var.efs_mount_point}

# Mount EFS
echo "${var.efs_id}:/ ${var.efs_mount_point} efs _netdev,tls,iam 0 0" >> /etc/fstab
mount -a

# Set proper permissions
chown apache:apache ${var.efs_mount_point}

# Create a simple health check file
cat > /var/www/html/health.php << 'HEALTHFILE'
<?php
header('Content-Type: application/json');
echo json_encode(['status' => 'healthy', 'timestamp' => time()]);
?>
HEALTHFILE

# Create a simple info file
cat > /var/www/html/info.php << 'INFOFILE'
<?php
phpinfo();
?>
INFOFILE

# Create a simple index file
cat > /var/www/html/index.php << 'INDEXFILE'
<!DOCTYPE html>
<html>
<head>
    <title>LAMP Stack</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background-color: white;
            padding: 20px;
            border-radius: 5px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
        }
        .status {
            padding: 10px;
            background-color: #e7f3fe;
            border-left: 3px solid #2196F3;
            margin-bottom: 20px;
        }
        .db-status {
            margin-top: 20px;
            padding: 15px;
            background-color: #f1f1f1;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>LAMP Stack on AWS</h1>
        <div class="status">
            <p>Server is running successfully!</p>
            <p>PHP Version: <?php echo phpversion(); ?></p>
        </div>
        
        <div class="db-status">
            <h2>Database Connection Test</h2>
            <?php
            $host = '${var.db_endpoint}';
            $dbname = '${var.db_name}';
            $username = '${var.db_username}';
            $password = '${var.db_password}';
            
            try {
                $conn = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
                $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                echo "<p style='color:green'>Connected successfully to the database!</p>";
            } catch(PDOException $e) {
                echo "<p style='color:red'>Connection failed: " . $e->getMessage() . "</p>";
            }
            ?>
        </div>
        
        <p>This is a simple LAMP stack running on AWS with:</p>
        <ul>
            <li>Linux (Amazon Linux 2)</li>
            <li>Apache Web Server</li>
            <li>MySQL (Amazon RDS)</li>
            <li>PHP <?php echo phpversion(); ?></li>
        </ul>
        
        <p>Shared storage is provided by Amazon EFS mounted at: <?php echo '${var.efs_mount_point}'; ?></p>
        
        <p>Current time: <?php echo date('Y-m-d H:i:s'); ?></p>
        <p>Server IP: <?php echo $_SERVER['SERVER_ADDR']; ?></p>
    </div>
</body>
</html>
INDEXFILE

# Set proper permissions
chmod 644 /var/www/html/health.php
chmod 644 /var/www/html/info.php
chmod 644 /var/www/html/index.php
chown apache:apache /var/www/html/health.php
chown apache:apache /var/www/html/info.php
chown apache:apache /var/www/html/index.php

# Restart Apache to apply changes
systemctl restart httpd
EOF
}

# Launch Template
resource "aws_launch_template" "main" {
  name_prefix   = "${var.project_name}-${var.environment}-lt-"
  image_id      = data.aws_ami.amazon_linux_2.id
  instance_type = var.instance_type
  key_name      = var.key_name
  
  iam_instance_profile {
    name = var.iam_instance_profile
  }
  
  network_interfaces {
    associate_public_ip_address = false
    security_groups             = [var.security_group_id]
    delete_on_termination       = true
  }
  
  block_device_mappings {
    device_name = "/dev/xvda"
    
    ebs {
      volume_size           = 20
      volume_type           = "gp3"
      delete_on_termination = true
      encrypted             = true
    }
  }
  
  user_data = base64encode(local.user_data)
  
  tag_specifications {
    resource_type = "instance"
    
    tags = merge(
      var.tags,
      {
        Name = "${var.project_name}-${var.environment}-web-server"
      }
    )
  }
  
  tag_specifications {
    resource_type = "volume"
    
    tags = merge(
      var.tags,
      {
        Name = "${var.project_name}-${var.environment}-web-server-volume"
      }
    )
  }
  
  lifecycle {
    create_before_destroy = true
  }
}

# Auto Scaling Group
resource "aws_autoscaling_group" "main" {
  name                = "${var.project_name}-${var.environment}-asg"
  vpc_zone_identifier = var.subnet_ids
  min_size            = var.min_size
  max_size            = var.max_size
  desired_capacity    = var.desired_capacity
  
  launch_template {
    id      = aws_launch_template.main.id
    version = "$Latest"
  }
  
  target_group_arns         = var.target_group_arns
  health_check_type         = "ELB"
  health_check_grace_period = 300
  
  default_cooldown          = 300
  force_delete              = false
  termination_policies      = ["OldestInstance"]
  
  dynamic "tag" {
    for_each = merge(
      var.tags,
      {
        Name = "${var.project_name}-${var.environment}-web-server"
      }
    )
    
    content {
      key                 = tag.key
      value               = tag.value
      propagate_at_launch = true
    }
  }
  
  lifecycle {
    create_before_destroy = true
  }
}

# Auto Scaling Policies
resource "aws_autoscaling_policy" "scale_up" {
  name                   = "${var.project_name}-${var.environment}-scale-up"
  autoscaling_group_name = aws_autoscaling_group.main.name
  adjustment_type        = "ChangeInCapacity"
  scaling_adjustment     = 1
  cooldown               = 300
}

resource "aws_autoscaling_policy" "scale_down" {
  name                   = "${var.project_name}-${var.environment}-scale-down"
  autoscaling_group_name = aws_autoscaling_group.main.name
  adjustment_type        = "ChangeInCapacity"
  scaling_adjustment     = -1
  cooldown               = 300
}

# CloudWatch Alarms for Auto Scaling
resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "${var.project_name}-${var.environment}-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 70
  alarm_description   = "Scale up if CPU utilization is above 70% for 10 minutes"
  
  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.main.name
  }
  
  alarm_actions = [aws_autoscaling_policy.scale_up.arn]
}

resource "aws_cloudwatch_metric_alarm" "low_cpu" {
  alarm_name          = "${var.project_name}-${var.environment}-low-cpu"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 30
  alarm_description   = "Scale down if CPU utilization is below 30% for 10 minutes"
  
  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.main.name
  }
  
  alarm_actions = [aws_autoscaling_policy.scale_down.arn]
}
