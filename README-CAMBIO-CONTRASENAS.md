# Cambio de contraseñas de perfiles (Admin y Funcionario)

Este documento explica como cambiar las contraseñas en produccion (servidor EC2).

## 1. Conectarse al servidor

Desde tu computador:

```bash
ssh -i ~/.ssh/weichafe-ec2 ec2-user@54.226.22.80
```

## 2. Ir al directorio de la app web

```bash
cd ~/weichafe-standalone
```

## 3. Crear script temporal para cambiar contraseñas

```bash
cat > change-password.js <<'EOF'
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const newPassword = process.argv[3];

  if (!email || !newPassword) {
    console.error("Uso: node change-password.js <email> <nueva_password>");
    process.exit(1);
  }

  if (newPassword.length < 6) {
    console.error("La contrasena debe tener al menos 6 caracteres.");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error("No existe usuario con ese email:", email);
    process.exit(1);
  }

  const hash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { email },
    data: { passwordHash: hash },
  });

  console.log(`Contrasena actualizada para ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
EOF
```

## 4. Cambiar la contraseña del Administrador

```bash
DATABASE_URL='file:/home/ec2-user/weichafe-standalone/dev.db' node change-password.js admin@weichafe.cl 'NUEVA_CLAVE_ADMIN_2026'
```

## 5. Cambiar la contraseña del Funcionario

```bash
DATABASE_URL='file:/home/ec2-user/weichafe-standalone/dev.db' node change-password.js funcionario@weichafe.cl 'NUEVA_CLAVE_STAFF_2026'
```

## 6. Probar acceso en la app

Abre la web y valida login con las nuevas claves:

- `admin@weichafe.cl`
- `funcionario@weichafe.cl`

## 7. Eliminar script temporal

```bash
rm -f change-password.js
```

## 8. (Opcional) Verificar que el servicio sigue activo

```bash
sudo systemctl status weichafe.service --no-pager
```

---

## Notas importantes

- Haz el cambio con claves fuertes (12+ caracteres, mayusculas, minusculas, numeros y simbolos).
- Si quieres rotar credenciales de forma periodica, repite los pasos 4 y 5.
- Si olvidaste una clave, vuelve a ejecutar el mismo proceso y define una nueva.
