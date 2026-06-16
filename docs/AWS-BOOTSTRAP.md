# AWS bootstrap desde cero para Weichafe

Esta guia crea infraestructura minima en AWS para que el workflow de deploy funcione.

## 1) Requisitos

- AWS CLI instalado y autenticado en tu cuenta.
- Terraform >= 1.6 instalado.
- Par de llaves SSH local para EC2.

En Windows PowerShell, puedes generar la llave asi:

```powershell
ssh-keygen -t ed25519 -f $HOME/.ssh/weichafe-ec2 -N '""'
```

## 2) Provisionar EC2 + Security Group + Elastic IP

Ubicate en la carpeta de Terraform:

```powershell
Set-Location infra/terraform
```

Inicializa Terraform:

```powershell
terraform init
```

Aplica infraestructura (reemplaza YOUR_PUBLIC_IP_CIDR por tu IP para SSH):

```powershell
$pubKey = Get-Content $HOME/.ssh/weichafe-ec2.pub -Raw
terraform apply -auto-approve `
  -var "ssh_public_key=$pubKey" `
  -var "allowed_ssh_cidr=YOUR_PUBLIC_IP_CIDR"
```

Ejemplo de CIDR: `181.10.20.30/32`.

Obtiene la IP publica resultante:

```powershell
terraform output public_ip
```

## 3) Configurar secretos de GitHub Actions

En el repo, crea/actualiza estos secrets:

- EC2_HOST: IP publica entregada por Terraform.
- EC2_SSH_KEY: contenido de la llave privada local.

Para copiar la llave privada en Windows:

```powershell
Get-Content $HOME/.ssh/weichafe-ec2 -Raw
```

## 4) Validar conectividad previa

```powershell
Test-NetConnection <EC2_HOST> -Port 22
Test-NetConnection <EC2_HOST> -Port 80
```

## 5) Disparar deploy

Empuja a main o ejecuta el workflow Deploy to EC2.

## 6) Verificar app

Cuando el workflow termine en success:

```powershell
Invoke-WebRequest -Uri "http://<EC2_HOST>/login" -UseBasicParsing
```

## Notas

- El servicio systemd creado es `weichafe.service`.
- El workflow existente ya copia el bundle standalone y hace restart del servicio.
- Si cambias de IP publica, actualiza el secret EC2_HOST.
