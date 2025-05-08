# DNS Module
# Creates Route53 records for the ALB

# Get the hosted zone
data "aws_route53_zone" "main" {
  count = var.domain_name != "" ? 1 : 0
  name  = var.domain_name
}

# Create A record for the ALB
resource "aws_route53_record" "main" {
  count   = var.domain_name != "" ? 1 : 0
  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = var.subdomain != "" ? "${var.subdomain}.${var.domain_name}" : var.domain_name
  type    = "A"
  
  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}

# Create CNAME record for www
resource "aws_route53_record" "www" {
  count   = var.domain_name != "" && var.create_www_record ? 1 : 0
  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = "www.${var.subdomain != "" ? "${var.subdomain}." : ""}${var.domain_name}"
  type    = "CNAME"
  ttl     = 300
  records = [var.subdomain != "" ? "${var.subdomain}.${var.domain_name}" : var.domain_name]
}

# Create ACM certificate
resource "aws_acm_certificate" "main" {
  count                     = var.domain_name != "" && var.create_certificate ? 1 : 0
  domain_name               = var.subdomain != "" ? "${var.subdomain}.${var.domain_name}" : var.domain_name
  subject_alternative_names = var.create_www_record ? ["www.${var.subdomain != "" ? "${var.subdomain}." : ""}${var.domain_name}"] : []
  validation_method         = "DNS"
  
  lifecycle {
    create_before_destroy = true
  }
  
  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-certificate"
    }
  )
}

# Create DNS validation records for the certificate
resource "aws_route53_record" "cert_validation" {
  for_each = var.domain_name != "" && var.create_certificate ? {
    for dvo in aws_acm_certificate.main[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}
  
  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 60
}

# Validate the certificate
resource "aws_acm_certificate_validation" "main" {
  count                   = var.domain_name != "" && var.create_certificate ? 1 : 0
  certificate_arn         = aws_acm_certificate.main[0].arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}
