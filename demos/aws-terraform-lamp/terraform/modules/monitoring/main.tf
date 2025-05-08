# Monitoring Module
# Creates CloudWatch dashboards and alarms

# CloudWatch Dashboard for the LAMP stack
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.project_name}-${var.environment}-dashboard"
  
  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "text"
        x      = 0
        y      = 0
        width  = 24
        height = 1
        properties = {
          markdown = "# ${var.project_name}-${var.environment} LAMP Stack Dashboard"
        }
      },
      {
        type   = "text"
        x      = 0
        y      = 1
        width  = 24
        height = 1
        properties = {
          markdown = "## EC2 Instances"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 2
        width  = 8
        height = 6
        properties = {
          metrics = [
            ["AWS/EC2", "CPUUtilization", "AutoScalingGroupName", var.asg_name, { "stat" = "Average" }]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.region
          title   = "EC2 CPU Utilization"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 8
        y      = 2
        width  = 8
        height = 6
        properties = {
          metrics = [
            ["AWS/EC2", "NetworkIn", "AutoScalingGroupName", var.asg_name, { "stat" = "Average" }],
            ["AWS/EC2", "NetworkOut", "AutoScalingGroupName", var.asg_name, { "stat" = "Average" }]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.region
          title   = "EC2 Network Traffic"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 16
        y      = 2
        width  = 8
        height = 6
        properties = {
          metrics = [
            ["AWS/EC2", "StatusCheckFailed", "AutoScalingGroupName", var.asg_name, { "stat" = "Sum" }],
            ["AWS/EC2", "StatusCheckFailed_Instance", "AutoScalingGroupName", var.asg_name, { "stat" = "Sum" }],
            ["AWS/EC2", "StatusCheckFailed_System", "AutoScalingGroupName", var.asg_name, { "stat" = "Sum" }]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.region
          title   = "EC2 Status Checks"
          period  = 300
        }
      },
      {
        type   = "text"
        x      = 0
        y      = 8
        width  = 24
        height = 1
        properties = {
          markdown = "## RDS Database"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 9
        width  = 8
        height = 6
        properties = {
          metrics = [
            ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", var.db_instance_id, { "stat" = "Average" }]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.region
          title   = "RDS CPU Utilization"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 8
        y      = 9
        width  = 8
        height = 6
        properties = {
          metrics = [
            ["AWS/RDS", "FreeableMemory", "DBInstanceIdentifier", var.db_instance_id, { "stat" = "Average" }]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.region
          title   = "RDS Freeable Memory"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 16
        y      = 9
        width  = 8
        height = 6
        properties = {
          metrics = [
            ["AWS/RDS", "ReadIOPS", "DBInstanceIdentifier", var.db_instance_id, { "stat" = "Average" }],
            ["AWS/RDS", "WriteIOPS", "DBInstanceIdentifier", var.db_instance_id, { "stat" = "Average" }]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.region
          title   = "RDS IOPS"
          period  = 300
        }
      },
      {
        type   = "text"
        x      = 0
        y      = 15
        width  = 24
        height = 1
        properties = {
          markdown = "## Load Balancer"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 16
        width  = 8
        height = 6
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", var.alb_arn_suffix, { "stat" = "Sum" }]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.region
          title   = "ALB Request Count"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 8
        y      = 16
        width  = 8
        height = 6
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "HTTPCode_ELB_4XX_Count", "LoadBalancer", var.alb_arn_suffix, { "stat" = "Sum" }],
            ["AWS/ApplicationELB", "HTTPCode_ELB_5XX_Count", "LoadBalancer", var.alb_arn_suffix, { "stat" = "Sum" }],
            ["AWS/ApplicationELB", "HTTPCode_Target_4XX_Count", "LoadBalancer", var.alb_arn_suffix, { "stat" = "Sum" }],
            ["AWS/ApplicationELB", "HTTPCode_Target_5XX_Count", "LoadBalancer", var.alb_arn_suffix, { "stat" = "Sum" }]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.region
          title   = "ALB Error Codes"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 16
        y      = 16
        width  = 8
        height = 6
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", var.alb_arn_suffix, { "stat" = "Average" }]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.region
          title   = "ALB Target Response Time"
          period  = 300
        }
      },
      {
        type   = "text"
        x      = 0
        y      = 22
        width  = 24
        height = 1
        properties = {
          markdown = "## EFS Storage"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 23
        width  = 8
        height = 6
        properties = {
          metrics = [
            ["AWS/EFS", "BurstCreditBalance", "FileSystemId", var.efs_id, { "stat" = "Average" }]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.region
          title   = "EFS Burst Credit Balance"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 8
        y      = 23
        width  = 8
        height = 6
        properties = {
          metrics = [
            ["AWS/EFS", "StorageBytes", "FileSystemId", var.efs_id, "StorageClass", "Total", { "stat" = "Average" }]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.region
          title   = "EFS Storage Bytes"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 16
        y      = 23
        width  = 8
        height = 6
        properties = {
          metrics = [
            ["AWS/EFS", "TotalIOBytes", "FileSystemId", var.efs_id, { "stat" = "Sum" }]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.region
          title   = "EFS Total IO Bytes"
          period  = 300
        }
      }
    ]
  })
}

# CloudWatch Composite Alarm for overall system health
resource "aws_cloudwatch_composite_alarm" "system_health" {
  alarm_name        = "${var.project_name}-${var.environment}-system-health"
  alarm_description = "Composite alarm for overall system health"
  
  alarm_rule = "ALARM(${var.ec2_cpu_alarm_arn}) OR ALARM(${var.rds_cpu_alarm_arn}) OR ALARM(${var.alb_5xx_alarm_arn})"
  
  actions_enabled = true
  alarm_actions   = var.alarm_actions
  ok_actions      = var.ok_actions
  
  tags = var.tags
}

# CloudWatch Log Group for application logs
resource "aws_cloudwatch_log_group" "app_logs" {
  name              = "/aws/ec2/${var.project_name}-${var.environment}-app-logs"
  retention_in_days = 30
  
  tags = var.tags
}

# CloudWatch Log Group for access logs
resource "aws_cloudwatch_log_group" "access_logs" {
  name              = "/aws/ec2/${var.project_name}-${var.environment}-access-logs"
  retention_in_days = 30
  
  tags = var.tags
}

# CloudWatch Log Group for error logs
resource "aws_cloudwatch_log_group" "error_logs" {
  name              = "/aws/ec2/${var.project_name}-${var.environment}-error-logs"
  retention_in_days = 30
  
  tags = var.tags
}

# CloudWatch Log Metric Filter for PHP errors
resource "aws_cloudwatch_log_metric_filter" "php_errors" {
  name           = "${var.project_name}-${var.environment}-php-errors"
  pattern        = "[date, time, x, x, x, php, error, level=ERROR, x, message]"
  log_group_name = aws_cloudwatch_log_group.error_logs.name
  
  metric_transformation {
    name      = "${var.project_name}-${var.environment}-php-errors"
    namespace = "Custom/LAMP"
    value     = "1"
  }
}

# CloudWatch Alarm for PHP errors
resource "aws_cloudwatch_metric_alarm" "php_errors" {
  alarm_name          = "${var.project_name}-${var.environment}-php-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "${var.project_name}-${var.environment}-php-errors"
  namespace           = "Custom/LAMP"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "This alarm monitors PHP errors"
  
  alarm_actions = var.alarm_actions
  ok_actions    = var.ok_actions
  
  tags = var.tags
}
