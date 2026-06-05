# Weichafe - Gestion de Academia

Aplicacion para PC, celular y tablet para administrar alumnos, mensualidades, clases diarias, horarios y comprobantes.

## Funcionalidades

- Perfil completo de alumno: nombre, fecha nacimiento, edad, correo, WhatsApp, direccion, comuna y telefono de emergencia.
- Registro de mensualidades con:
  - Fecha de pago
  - Mes que cubre
  - Disciplina
  - Estado (pagado, pendiente, saltado)
- Alerta visual de meses saltados.
- Venta por clase diaria.
- Emision de comprobantes por metodo de pago.
- Logo institucional integrado en dashboard y comprobantes.
- Panel de valores y horarios de la academia.

## Valores mensuales configurados

- Boxeo y MMA mujeres: $44.990
- MMA, BJJ y Kickboxing: $49.990
- MMA ninos: $39.990
- BJJ ninos: $39.990
- Matricula: $25.000

## Horarios cargados

- MMA (7 bloques)
- Brazilian Jiu Jitsu (4 bloques)
- Kickboxing (2 bloques)
- Boxeo (2 bloques)

## Stack

- Next.js 16 + TypeScript
- Prisma + SQLite
- Electron + electron-builder (Windows/macOS)
- Capacitor Android + iOS

## Desarrollo local

```bash
npm install
cp .env.example .env
npm run prisma:migrate -- --name init
npm run db:seed
npm run dev
```

## Build web produccion

```bash
npm run build
npm run start
```

## App de escritorio

Modo desarrollo desktop:

```bash
npm run desktop:dev
```

Empaquetado base (carpeta ejecutable sin instalador):

```bash
npm run desktop:pack
```

Instalador Windows (NSIS):

```bash
npm run desktop:win
```

App macOS (DMG):

```bash
npm run desktop:mac
```

Los artefactos quedan en `dist-electron/`.

Para reunir instaladores en una sola carpeta:

```bash
npm run collect:installers
```

Se guardan en `installers/`.

## App Android

La app Android se genera como contenedor nativo (WebView) con Capacitor.

1. Reemplaza el dominio en `capacitor.config.ts` (`server.url`) por la URL publica de tu sistema.
2. Sincroniza Android:

```bash
npm run android:sync
```

3. Abre Android Studio:

```bash
npm run android:open
```

4. Desde Android Studio compila APK/AAB.

Opcional por terminal (requiere Android SDK configurado):

```bash
npm run android:apk:debug
```

## App iOS

La app iOS tambien funciona como contenedor nativo (WebView) con Capacitor.

1. Reemplaza el dominio en `capacitor.config.ts` (`server.url`) por tu URL publica.
2. Sincroniza iOS:

```bash
npm run ios:sync
```

3. Abre Xcode:

```bash
npm run ios:open
```

4. En Xcode selecciona Team/Signing y genera el build para simulador o dispositivo.
5. Para IPA de distribucion necesitas certificados/perfiles de Apple Developer.

## Base de datos y donde se guarda la data

La app usa Prisma con SQLite.

- En desarrollo web local: la base queda en `prisma/dev.db`.
- En app de escritorio instalada: la base se copia/usa en la carpeta de usuario del sistema (no dentro del bundle), archivo `weichafe.db`.

Rutas tipicas:

- macOS: `~/Library/Application Support/Weichafe/weichafe.db`
- Windows: `%APPDATA%/Weichafe/weichafe.db`

## Logo

- Logo unico web, recibos e instaladores: `public/weichafe.jpg`

## Documentación técnica

- [Arquitectura, diagramas de flujo y stack detallado](docs/ARCHITECTURE.md)
- [Operacion AWS (encender, desplegar y apagar)](docs/AWS-OPERACION.md)
- [Bootstrap de infraestructura AWS desde cero](docs/AWS-BOOTSTRAP.md)
- [Auto Deploy y Teardown (GitHub Actions)](docs/AWS_AUTODEPLOY.md)

## Operacion rapida AWS

### Desde otro equipo usando GitHub Actions

Este repo incluye un workflow que arranca la instancia, despliega la app, comprueba `/login` y apaga la instancia automáticamente.

1. Agrega secrets en GitHub: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `EC2_INSTANCE_ID`, `SSH_PRIVATE_KEY`.
2. Entra a Actions → `Auto Deploy and Teardown`.
3. Ejecuta el workflow y ajusta `keep_alive_minutes`.

### Desde otro equipo usando el script manual

```bash
git clone https://github.com/eduardoreuque/weichafe.git
cd weichafe
npm install
export AWS_REGION=us-east-1
export EC2_INSTANCE_ID=i-0ee7429f5b6b2d10a
export SSH_KEY=~/.ssh/weichafe-ec2
./scripts/deploy-ec2.sh
./scripts/ec2-control.sh stop
```

Comandos utiles:

```bash
./scripts/ec2-control.sh status
./scripts/ec2-control.sh url
./scripts/ec2-control.sh start
./scripts/ec2-control.sh stop
```

La forma recomendada es usar GitHub Actions para evitar tener que ejecutar comandos directos desde tu laptop y para apagar automáticamente la instancia.
