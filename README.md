# Weichafe - Gestion de Academia (PC y Celular)

Aplicacion web responsiva para administrar alumnos, mensualidades, clases diarias y comprobantes de pago.

## Funcionalidades incluidas

- Perfil de alumno con:
	- Nombre completo
	- Fecha de nacimiento y edad calculada
	- Correo
	- WhatsApp
	- Direccion y comuna
	- Telefono de emergencia
- Registro de mensualidades:
	- Fecha de pago
	- Mes que cubre la mensualidad
	- Disciplina (MMA, Kick, Boxeo, Jiu Jitsu, etc.)
	- Estado: pagado, pendiente o saltado
	- Historial por alumno
- Deteccion visual de meses saltados por disciplina.
- Venta por clase diaria (clase suelta).
- Emision de comprobantes con metodo de pago:
	- Efectivo
	- Transferencia
	- Tarjeta debito
	- Tarjeta credito
- Vista imprimible de comprobante.

## Stack

- Next.js 16 + TypeScript + App Router
- Prisma ORM
- SQLite (archivo local)
- Tailwind CSS

## Ejecutar en local

1. Instalar dependencias

```bash
npm install
```

2. Configurar variables de entorno

```bash
cp .env.example .env
```

3. Crear base de datos y tablas

```bash
npm run prisma:migrate -- --name init
```

4. Cargar datos de ejemplo

```bash
npm run db:seed
```

5. Levantar en desarrollo

```bash
npm run dev
```

App disponible en http://localhost:3000.

## Build de produccion

```bash
npm run build
npm run start
```

## Estructura principal

- prisma/schema.prisma: modelos de datos
- prisma/seed.ts: datos iniciales
- src/app/page.tsx: dashboard principal y formularios
- src/app/actions.ts: acciones del servidor
- src/app/comprobantes/[id]/page.tsx: comprobante imprimible
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
