# Monitoring Module Outputs

output "dashboard_name" {
  description = "Name of the CloudWatch dashboard"
  value       = aws_cloudwatch_dashboard.main.dashboard_name
}

output "dashboard_arn" {
  description = "ARN of the CloudWatch dashboard"
  value       = aws_cloudwatch_dashboard.main.dashboard_arn
}

output "system_health_alarm_arn" {
  description = "ARN of the system health composite alarm"
  value       = aws_cloudwatch_composite_alarm.system_health.arn
}

output "system_health_alarm_id" {
  description = "ID of the system health composite alarm"
  value       = aws_cloudwatch_composite_alarm.system_health.id
}

output "app_log_group_name" {
  description = "Name of the application log group"
  value       = aws_cloudwatch_log_group.app_logs.name
}

output "app_log_group_arn" {
  description = "ARN of the application log group"
  value       = aws_cloudwatch_log_group.app_logs.arn
}

output "access_log_group_name" {
  description = "Name of the access log group"
  value       = aws_cloudwatch_log_group.access_logs.name
}

output "access_log_group_arn" {
  description = "ARN of the access log group"
  value       = aws_cloudwatch_log_group.access_logs.arn
}

output "error_log_group_name" {
  description = "Name of the error log group"
  value       = aws_cloudwatch_log_group.error_logs.name
}

output "error_log_group_arn" {
  description = "ARN of the error log group"
  value       = aws_cloudwatch_log_group.error_logs.arn
}

output "php_errors_alarm_arn" {
  description = "ARN of the PHP errors alarm"
  value       = aws_cloudwatch_metric_alarm.php_errors.arn
}

output "php_errors_alarm_id" {
  description = "ID of the PHP errors alarm"
  value       = aws_cloudwatch_metric_alarm.php_errors.id
}
