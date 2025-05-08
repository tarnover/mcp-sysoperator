# Monitoring Module Variables

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
}

variable "region" {
  description = "AWS region"
  type        = string
}

variable "asg_name" {
  description = "Name of the Auto Scaling Group"
  type        = string
}

variable "db_instance_id" {
  description = "ID of the RDS instance"
  type        = string
}

variable "alb_arn_suffix" {
  description = "ARN suffix of the ALB"
  type        = string
}

variable "efs_id" {
  description = "ID of the EFS file system"
  type        = string
}

variable "ec2_cpu_alarm_arn" {
  description = "ARN of the EC2 CPU alarm"
  type        = string
}

variable "rds_cpu_alarm_arn" {
  description = "ARN of the RDS CPU alarm"
  type        = string
}

variable "alb_5xx_alarm_arn" {
  description = "ARN of the ALB 5XX alarm"
  type        = string
}

variable "alarm_actions" {
  description = "List of ARNs to notify when the alarm transitions to ALARM state"
  type        = list(string)
  default     = []
}

variable "ok_actions" {
  description = "List of ARNs to notify when the alarm transitions to OK state"
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "A map of tags to add to all resources"
  type        = map(string)
  default     = {}
}
