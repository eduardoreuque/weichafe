# Nginx Deployment Fix - Server Actions Origin Validation

## Problema

El login en la aplicación fallaba con error HTTP 500 cuando se accedía desde el navegador a `http://52.73.75.121/login`, aunque las pruebas con `curl` funcionaban correctamente.

### Error en logs del servidor

```
`x-forwarded-host` header with value `127.0.0.1:3000` does not match 
`origin` header with value `52.73.75.121` from a forwarded Server Actions request. 
Aborting the action.

⨯ Error: Invalid Server Actions request.
```

## Causa Root

Next.js Server Actions implementa validación de origen (`origin` header) para proteger contra ataques CSRF. Cuando la aplicación se ejecuta detrás de un reverse proxy (nginx), es crítico que el proxy forwarde los headers `X-Forwarded-*` correctamente.

La configuración original de nginx en `/etc/nginx/conf.d/weichafe.conf` era mínima:

```nginx
server {
  listen 80;
  server_name _;
  location / {
    proxy_pass http://127.0.0.1:3000;
  }
}
```

**Sin headers forwarded**, Next.js recibía:
- `x-forwarded-host`: `127.0.0.1:3000` (direccion interna del servidor)
- `origin`: `52.73.75.121` (IP pública del cliente)

Estas no coincidían, por lo que Next.js rechazaba la solicitud como potencial ataque CSRF.

## Solución Implementada

Se actualizó la configuración de nginx para incluir los headers necesarios:

### Archivo: `/etc/nginx/conf.d/weichafe.conf`

```nginx
server {
  listen 80;
  server_name _;
  
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    
    # Pass headers to allow Next.js to validate origin correctly
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
    
    # WebSocket support
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

### Headers clave:

| Header | Propósito |
|--------|-----------|
| `Host` | Indica el dominio/IP original de la solicitud |
| `X-Real-IP` | Preserva la IP real del cliente |
| `X-Forwarded-For` | Lista de IPs en la cadena de proxies |
| `X-Forwarded-Proto` | Protocolo original (HTTP/HTTPS) |
| `X-Forwarded-Host` | Dominio/IP original, usado por Next.js para validación |
| `Upgrade` + `Connection` | Permite WebSocket a través del proxy |

## Pasos de Aplicación

### 1. Acceder al servidor EC2

```bash
ssh -i ~/.ssh/weichafe-ec2 ec2-user@52.73.75.121
```

### 2. Actualizar configuración

```bash
sudo tee /etc/nginx/conf.d/weichafe.conf > /dev/null <<'EOF'
server {
  listen 80;
  server_name _;
  
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    
    # Pass headers to allow Next.js to validate origin
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
    
    # Websocket support
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
EOF
```

### 3. Validar sintaxis

```bash
sudo nginx -t
# Output esperado:
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 4. Recargar nginx

```bash
sudo systemctl reload nginx
```

### 5. Verificar logs

```bash
sudo journalctl -u weichafe.service -n 20 --no-pager
# No deben aparecer errores de "Invalid Server Actions request"
```

## Validación de la Solución

Después de aplicar los cambios, el login funciona correctamente:

- ✅ Acceso a `http://52.73.75.121/login` (GET 200)
- ✅ Envío de formulario (POST → HTTP 303 redirect)
- ✅ Cookie de sesión establecida correctamente
- ✅ Redirección a dashboard (`/`)
- ✅ Usuario autenticado con acceso completo

### Credenciales de prueba

```
Email:     admin@weichafe.cl
Contraseña: admin2024
Rol:       Administrador
```

## Impacto

- **Usuarios afectados**: Todos los usuarios que acceden vía IP pública (52.73.75.121)
- **Funcionalidades corregidas**: 
  - Login (formulario Server Action)
  - Cualquier otra operación que use Server Actions
  - WebSocket (si se implementa en el futuro)

## Notas de mantenimiento

1. **Upgrades de Next.js**: Si se actualiza Next.js, verificar que la validación de origin siga siendo estricta.

2. **HTTPS futuro**: Si se configura HTTPS:
   - Cambiar `X-Forwarded-Proto` a `https`
   - Let's Encrypt + cert-manager recomendados

3. **Dominios**: Si se asigna un dominio a la aplicación, nginx y Next.js continuarán funcionando sin cambios (headers se ajustan automáticamente).

4. **Reverse Proxy alternativo**: Este mismo patrón de headers aplica para Apache, Traefik, HAProxy, etc.

## Referencias

- [Next.js Server Actions - Security](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [Nginx Proxy Headers](http://nginx.org/en/docs/http/ngx_http_proxy_module.html)
- [RFC 7239 - Forwarded HTTP Extension](https://datatracker.ietf.org/doc/html/rfc7239)
