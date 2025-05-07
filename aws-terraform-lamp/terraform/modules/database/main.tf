# Database Module
# Creates RDS MySQL instance

# Random password for the database if not provided
resource "random_password" "db_password" {
  count   = var.db_password == "" ? 1 : 0
  length  = 16
  special = false
}

# DB Subnet Group
resource "aws_db_subnet_group" "main" {
  name        = "${var.project_name}-${var.environment}-db-subnet-group"
  description = "DB subnet group for ${var.project_name}-${var.environment}"
  subnet_ids  = var.subnet_ids
  
  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-db-subnet-group"
    }
  )
}

# DB Parameter Group
resource "aws_db_parameter_group" "main" {
  name        = "${var.project_name}-${var.environment}-db-parameter-group"
  family      = "mysql8.0"
  description = "DB parameter group for ${var.project_name}-${var.environment}"
  
  parameter {
    name  = "character_set_server"
    value = "utf8mb4"
  }
  
  parameter {
    name  = "character_set_client"
    value = "utf8mb4"
  }
  
  parameter {
    name  = "max_connections"
    value = "1000"
  }
  
  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-db-parameter-group"
    }
  )
}

# DB Option Group
resource "aws_db_option_group" "main" {
  name                     = "${var.project_name}-${var.environment}-db-option-group"
  option_group_description = "DB option group for ${var.project_name}-${var.environment}"
  engine_name              = "mysql"
  major_engine_version     = "8.0"
  
  option {
    option_name = "MARIADB_AUDIT_PLUGIN"
    
    option_settings {
      name  = "SERVER_AUDIT_EVENTS"
      value = "CONNECT,QUERY"
    }
    
    option_settings {
      name  = "SERVER_AUDIT_FILE_ROTATIONS"
      value = "30"
    }
  }
  
  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-db-option-group"
    }
  )
}

# RDS MySQL Instance
resource "aws_db_instance" "main" {
  identifier              = "${var.project_name}-${var.environment}-db"
  engine                  = "mysql"
  engine_version          = "8.0"
  instance_class          = var.db_instance_class
  allocated_storage       = var.allocated_storage
  storage_type            = "gp2"
  storage_encrypted       = true
  db_name                 = var.db_name
  username                = var.db_username
  password                = var.db_password == "" ? random_password.db_password[0].result : var.db_password
  port                    = 3306
  vpc_security_group_ids  = [var.security_group_id]
  db_subnet_group_name    = aws_db_subnet_group.main.name
  parameter_group_name    = aws_db_parameter_group.main.name
  option_group_name       = aws_db_option_group.main.name
  multi_az                = var.multi_az
  backup_retention_period = var.backup_retention_period
  backup_window           = "03:00-05:00"
  maintenance_window      = "Mon:00:00-Mon:03:00"
  skip_final_snapshot     = var.skip_final_snapshot
  final_snapshot_identifier = var.skip_final_snapshot ? null : "${var.project_name}-${var.environment}-db-final-snapshot"
  deletion_protection     = var.environment == "prod" ? true : false
  publicly_accessible     = false
  auto_minor_version_upgrade = true
  
  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-db"
    }
  )
}

# CloudWatch Alarms for RDS
resource "aws_cloudwatch_metric_alarm" "db_cpu" {
  alarm_name          = "${var.project_name}-${var.environment}-db-cpu-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "This alarm monitors RDS CPU utilization"
  
  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }
  
  alarm_actions = []  # Add SNS topic ARN here if needed
  ok_actions    = []  # Add SNS topic ARN here if needed
  
  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "db_memory_free" {
  alarm_name          = "${var.project_name}-${var.environment}-db-freeable-memory"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "FreeableMemory"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 1000000000  # 1GB
  alarm_description   = "This alarm monitors RDS freeable memory"
  
  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }
  
  alarm_actions = []  # Add SNS topic ARN here if needed
  ok_actions    = []  # Add SNS topic ARN here if needed
  
  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "db_disk_queue_depth" {
  alarm_name          = "${var.project_name}-${var.environment}-db-disk-queue-depth"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DiskQueueDepth"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 10
  alarm_description   = "This alarm monitors RDS disk queue depth"
  
  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }
  
  alarm_actions = []  # Add SNS topic ARN here if needed
  ok_actions    = []  # Add SNS topic ARN here if needed
  
  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "db_connections" {
  alarm_name          = "${var.project_name}-${var.environment}-db-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 800  # 80% of max connections (1000)
  alarm_description   = "This alarm monitors RDS database connections"
  
  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }
  
  alarm_actions = []  # Add SNS topic ARN here if needed
  ok_actions    = []  # Add SNS topic ARN here if needed
  
  tags = var.tags
}
