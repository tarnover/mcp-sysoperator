# Storage Module
# Creates EFS file system and mount targets

# EFS File System
resource "aws_efs_file_system" "main" {
  creation_token = "${var.project_name}-${var.environment}-efs"
  
  performance_mode = var.performance_mode
  throughput_mode  = var.throughput_mode
  encrypted        = true
  
  lifecycle_policy {
    transition_to_ia = "AFTER_30_DAYS"
  }
  
  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-efs"
    }
  )
}

# EFS Mount Targets (one per subnet)
resource "aws_efs_mount_target" "main" {
  count           = length(var.subnet_ids)
  file_system_id  = aws_efs_file_system.main.id
  subnet_id       = var.subnet_ids[count.index]
  security_groups = [var.security_group_id]
}

# EFS Access Point
resource "aws_efs_access_point" "main" {
  file_system_id = aws_efs_file_system.main.id
  
  posix_user {
    gid = 48  # Apache user GID
    uid = 48  # Apache user UID
  }
  
  root_directory {
    path = "/var/www/html/shared"
    creation_info {
      owner_gid   = 48
      owner_uid   = 48
      permissions = "0755"
    }
  }
  
  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-efs-ap"
    }
  )
}

# EFS Backup Policy
resource "aws_efs_backup_policy" "main" {
  file_system_id = aws_efs_file_system.main.id
  
  backup_policy {
    status = "ENABLED"
  }
}

# CloudWatch Alarms for EFS
resource "aws_cloudwatch_metric_alarm" "efs_burst_credit_balance" {
  alarm_name          = "${var.project_name}-${var.environment}-efs-burst-credit-balance"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "BurstCreditBalance"
  namespace           = "AWS/EFS"
  period              = 300
  statistic           = "Average"
  threshold           = 1000000000  # 1GB of burst credits
  alarm_description   = "This alarm monitors EFS burst credit balance"
  
  dimensions = {
    FileSystemId = aws_efs_file_system.main.id
  }
  
  alarm_actions = []  # Add SNS topic ARN here if needed
  ok_actions    = []  # Add SNS topic ARN here if needed
  
  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "efs_percent_io_limit" {
  alarm_name          = "${var.project_name}-${var.environment}-efs-percent-io-limit"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "PercentIOLimit"
  namespace           = "AWS/EFS"
  period              = 300
  statistic           = "Average"
  threshold           = 90
  alarm_description   = "This alarm monitors EFS IO limit utilization"
  
  dimensions = {
    FileSystemId = aws_efs_file_system.main.id
  }
  
  alarm_actions = []  # Add SNS topic ARN here if needed
  ok_actions    = []  # Add SNS topic ARN here if needed
  
  tags = var.tags
}
