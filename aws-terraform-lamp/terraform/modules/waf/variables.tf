# WAF Module Variables

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
}

variable "alb_arn" {
  description = "ARN of the ALB to associate with the WAF"
  type        = string
}

variable "allowed_ips" {
  description = "List of allowed IP addresses in CIDR notation"
  type        = list(string)
  default     = []
}

variable "blocked_ips" {
  description = "List of blocked IP addresses in CIDR notation"
  type        = list(string)
  default     = []
}

variable "rate_limit" {
  description = "Rate limit for requests from a single IP"
  type        = number
  default     = 1000
}

variable "enable_logging" {
  description = "Whether to enable logging for the WAF"
  type        = bool
  default     = true
}

variable "tags" {
  description = "A map of tags to add to all resources"
  type        = map(string)
  default     = {}
}
