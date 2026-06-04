#!/usr/bin/env bash
set -Eeuo pipefail

ACTION="${1:-status}"
AWS_REGION="${AWS_REGION:-us-east-1}"
INSTANCE_NAME="${INSTANCE_NAME:-weichafe-ec2-v3}"

usage() {
  cat <<'EOF'
Uso:
  ./scripts/ec2-control.sh status
  ./scripts/ec2-control.sh start
  ./scripts/ec2-control.sh stop
  ./scripts/ec2-control.sh url

Variables opcionales:
  AWS_REGION=us-east-1
  INSTANCE_NAME=weichafe-ec2-v3
EOF
}

get_instance_id() {
  aws ec2 describe-instances \
    --region "$AWS_REGION" \
    --filters "Name=tag:Name,Values=$INSTANCE_NAME" "Name=instance-state-name,Values=pending,running,stopping,stopped" \
    --query 'Reservations[].Instances[].InstanceId' \
    --output text
}

get_state() {
  local instance_id="$1"
  aws ec2 describe-instances \
    --region "$AWS_REGION" \
    --instance-ids "$instance_id" \
    --query 'Reservations[0].Instances[0].State.Name' \
    --output text
}

get_public_ip() {
  local instance_id="$1"
  aws ec2 describe-instances \
    --region "$AWS_REGION" \
    --instance-ids "$instance_id" \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text
}

INSTANCE_ID="$(get_instance_id)"

if [[ -z "$INSTANCE_ID" || "$INSTANCE_ID" == "None" ]]; then
  echo "No se encontro instancia con tag Name=$INSTANCE_NAME en $AWS_REGION"
  echo "Si fue eliminada, recreala con Terraform/workflow o AWS CLI antes de usar este script."
  exit 1
fi

case "$ACTION" in
  status)
    STATE="$(get_state "$INSTANCE_ID")"
    IP="$(get_public_ip "$INSTANCE_ID")"
    echo "INSTANCE_ID=$INSTANCE_ID"
    echo "STATE=$STATE"
    echo "PUBLIC_IP=$IP"
    ;;

  start)
    STATE="$(get_state "$INSTANCE_ID")"
    if [[ "$STATE" == "running" ]]; then
      echo "La instancia ya esta running: $INSTANCE_ID"
    else
      aws ec2 start-instances --region "$AWS_REGION" --instance-ids "$INSTANCE_ID" >/dev/null
      aws ec2 wait instance-running --region "$AWS_REGION" --instance-ids "$INSTANCE_ID"
      echo "Instancia iniciada: $INSTANCE_ID"
    fi
    IP="$(get_public_ip "$INSTANCE_ID")"
    echo "URL_LOGIN=http://$IP:3000/login"
    ;;

  stop)
    STATE="$(get_state "$INSTANCE_ID")"
    if [[ "$STATE" == "stopped" ]]; then
      echo "La instancia ya esta detenida: $INSTANCE_ID"
    else
      aws ec2 stop-instances --region "$AWS_REGION" --instance-ids "$INSTANCE_ID" >/dev/null
      aws ec2 wait instance-stopped --region "$AWS_REGION" --instance-ids "$INSTANCE_ID"
      echo "Instancia detenida: $INSTANCE_ID"
    fi
    ;;

  url)
    STATE="$(get_state "$INSTANCE_ID")"
    if [[ "$STATE" != "running" ]]; then
      echo "La instancia no esta running (estado: $STATE)."
      echo "Ejecuta: ./scripts/ec2-control.sh start"
      exit 1
    fi
    IP="$(get_public_ip "$INSTANCE_ID")"
    echo "http://$IP:3000/login"
    ;;

  -h|--help|help)
    usage
    ;;

  *)
    echo "Accion no valida: $ACTION"
    usage
    exit 1
    ;;
esac
