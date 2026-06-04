# Operacion AWS Weichafe (subir/bajar desde cualquier lugar)

Esta guia deja el flujo operativo para prender, probar, desplegar y apagar la web sin depender de una maquina especifica.

## 1) Requisitos minimos en cualquier equipo

- Git
- Node.js 20+
- npm
- AWS CLI autenticado
- Llave SSH privada de la EC2 (ejemplo: `~/.ssh/weichafe-ec2`)

Validaciones rapidas:

```bash
aws sts get-caller-identity
node -v
npm -v
```

## 2) Clonar y preparar

```bash
git clone https://github.com/eduardoreuque/weichafe.git
cd weichafe
npm install
cp .env.example .env
chmod +x scripts/*.sh
```

## 3) Encender / apagar EC2 para no pagar de mas

Script principal:

```bash
./scripts/ec2-control.sh status
./scripts/ec2-control.sh start
./scripts/ec2-control.sh url
./scripts/ec2-control.sh stop
```

Variables opcionales:

```bash
AWS_REGION=us-east-1 INSTANCE_NAME=weichafe-ec2-v3 ./scripts/ec2-control.sh status
```

## 4) Deploy web en EC2

```bash
./scripts/deploy-ec2.sh
```

Variables opcionales:

```bash
EC2_HOST=54.172.208.119 SSH_KEY=~/.ssh/weichafe-ec2 ./scripts/deploy-ec2.sh
```

Notas:

- El script hace build, empaqueta, sube por SSH, reinicia `weichafe.service` y valida `GET /login`.
- Se usa `DATABASE_URL` absoluta en systemd para evitar errores con SQLite en rutas relativas.

## 5) Flujo recomendado de trabajo

1. `git pull`
2. `./scripts/ec2-control.sh start`
3. `./scripts/deploy-ec2.sh`
4. Ejecutar pruebas funcionales
5. `git add/commit/push`
6. `./scripts/ec2-control.sh stop`

## 6) Recuperacion rapida ante fallos

- Ver estado del servicio:

```bash
ssh -i ~/.ssh/weichafe-ec2 ec2-user@$(./scripts/ec2-control.sh url | sed 's#http://##; s#:3000/login##') 'sudo systemctl status weichafe.service --no-pager'
```

- Ver logs:

```bash
ssh -i ~/.ssh/weichafe-ec2 ec2-user@54.172.208.119 'sudo journalctl -u weichafe.service -n 120 --no-pager'
```

## 7) Buenas practicas de costo

- Mantener EC2 apagada cuando no se use.
- Usar instancia Free Tier elegible.
- Evitar recursos extra (ELB/RDS/EIP) si no son necesarios para pruebas.
