output "instance_id" {
  description = "ID de la instancia EC2"
  value       = aws_instance.weichafe.id
}

output "public_ip" {
  description = "IP publica estatica (Elastic IP)"
  value       = aws_eip.weichafe.public_ip
}

output "security_group_id" {
  description = "ID del security group"
  value       = aws_security_group.weichafe.id
}

output "ssh_connection" {
  description = "Comando base para conectar por SSH"
  value       = "ssh -i ~/.ssh/${var.key_name} ec2-user@${aws_eip.weichafe.public_ip}"
}
