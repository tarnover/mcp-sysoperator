# Security Module Outputs

output "web_security_group_id" {
  description = "ID of the web server security group"
  value       = aws_security_group.web.id
}

output "alb_security_group_id" {
  description = "ID of the ALB security group"
  value       = aws_security_group.alb.id
}

output "db_security_group_id" {
  description = "ID of the database security group"
  value       = aws_security_group.db.id
}

output "efs_security_group_id" {
  description = "ID of the EFS security group"
  value       = aws_security_group.efs.id
}

output "web_server_role_arn" {
  description = "ARN of the web server IAM role"
  value       = aws_iam_role.web_server.arn
}

output "web_server_role_name" {
  description = "Name of the web server IAM role"
  value       = aws_iam_role.web_server.name
}

output "web_instance_profile_name" {
  description = "Name of the web server instance profile"
  value       = aws_iam_instance_profile.web_server.name
}

output "web_instance_profile_arn" {
  description = "ARN of the web server instance profile"
  value       = aws_iam_instance_profile.web_server.arn
}

output "public_nacl_id" {
  description = "ID of the public network ACL"
  value       = aws_network_acl.public.id
}

output "private_nacl_id" {
  description = "ID of the private network ACL"
  value       = aws_network_acl.private.id
}

output "database_nacl_id" {
  description = "ID of the database network ACL"
  value       = aws_network_acl.database.id
}
