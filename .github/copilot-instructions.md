# Instrucciones Copilot — Proyecto Weichafe

## Identidad del proyecto
- **Propietario:** Eduardo Reuque (cuenta personal GitHub: eduardoreuque)
- **Repositorio:** https://github.com/eduardoreuque/weichafe
- **Ubicación local:** ~/Projects/weichafe

## Stack técnico
- Next.js 16.2.4 (App Router, Turbopack, standalone output)
- TypeScript + Tailwind CSS
- Prisma 6 + SQLite (dev.db, nunca versionar)
- Autenticación: JWT (jose) + bcrypt (bcryptjs)
- Roles: ADMIN y STAFF
- Deploy: AWS EC2 (54.226.22.80), systemd service `weichafe.service`
- CI/CD: GitHub Actions (.github/workflows/deploy.yml)

## Reglas de desarrollo
- Los formularios usan fetch a rutas API (/api/students, /api/monthly-payments, /api/daily-class-sales), NO server actions directamente.
- El proxy de Next.js 16 está en src/proxy.ts (no middleware.ts). La función exportada se llama `proxy`.
- La cookie de sesión NO usa `secure: true` en HTTP — se controla con la variable COOKIE_SECURE=true solo si hay HTTPS.
- La base de datos dev.db está en .gitignore y NO se sube a GitHub.
- El logo oficial es /public/weichafe.jpg.

## Deploy manual
```bash
npm run build
node scripts/prepare-standalone.cjs
COPYFILE_DISABLE=1 tar czf /tmp/weichafe-standalone.tar.gz -C .next/standalone .
scp -i ~/.ssh/weichafe-ec2 /tmp/weichafe-standalone.tar.gz ec2-user@54.226.22.80:/home/ec2-user/weichafe-standalone.tar.gz
ssh -i ~/.ssh/weichafe-ec2 ec2-user@54.226.22.80 'mkdir -p ~/weichafe-standalone && tar xzf ~/weichafe-standalone.tar.gz -C ~/weichafe-standalone && sudo systemctl restart weichafe.service'
```

## Credenciales de producción (EC2)
- admin@weichafe.cl / admin2024
- funcionario@weichafe.cl / staff2024
- Cambiar con el script en README-CAMBIO-CONTRASENAS.md

## Git
- Git user local de este repo: Eduardo Reuque <eduardoreuque@gmail.com>
