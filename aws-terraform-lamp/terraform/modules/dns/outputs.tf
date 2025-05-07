# DNS Module Outputs

output "domain_name" {
  description = "Domain name for the application"
  value       = var.domain_name
}

output "fqdn" {
  description = "Fully qualified domain name for the application"
  value       = var.domain_name != "" ? (var.subdomain != "" ? "${var.subdomain}.${var.domain_name}" : var.domain_name) : null
}

output "certificate_arn" {
  description = "ARN of the ACM certificate"
  value       = var.domain_name != "" && var.create_certificate ? aws_acm_certificate.main[0].arn : null
}

output "certificate_domain_validation_options" {
  description = "Domain validation options for the ACM certificate"
  value       = var.domain_name != "" && var.create_certificate ? aws_acm_certificate.main[0].domain_validation_options : null
}

output "route53_record_name" {
  description = "Name of the Route53 record"
  value       = var.domain_name != "" ? aws_route53_record.main[0].name : null
}

output "route53_record_fqdn" {
  description = "FQDN of the Route53 record"
  value       = var.domain_name != "" ? aws_route53_record.main[0].fqdn : null
}

output "www_record_name" {
  description = "Name of the www Route53 record"
  value       = var.domain_name != "" && var.create_www_record ? aws_route53_record.www[0].name : null
}

output "www_record_fqdn" {
  description = "FQDN of the www Route53 record"
  value       = var.domain_name != "" && var.create_www_record ? aws_route53_record.www[0].fqdn : null
}
