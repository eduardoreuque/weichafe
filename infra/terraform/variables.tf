variable "aws_region" {
  description = "Region AWS para desplegar infraestructura"
  type        = string
  default     = "us-east-1"
}

variable "instance_name" {
  description = "Tag Name de la instancia"
  type        = string
  default     = "weichafe-ec2"
}

variable "instance_type" {
  description = "Tipo de instancia EC2"
  type        = string
  default     = "t3.micro"
}

variable "ami_id" {
  description = "AMI ID para la instancia"
  type        = string
}

variable "key_name" {
  description = "Nombre de key pair existente en AWS"
  type        = string
}

variable "root_volume_size" {
  description = "Tamaño de disco root en GB"
  type        = number
  default     = 8
}

variable "allow_ssh_cidr" {
  description = "CIDR permitido para SSH"
  type        = string
  default     = "0.0.0.0/0"
}

variable "app_port" {
  description = "Puerto de la app"
  type        = number
  default     = 3000
}
