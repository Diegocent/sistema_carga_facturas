# Cloudflare Tunnel - Exponer Aplicación Local

Esta guía explica cómo exponer tu aplicación Next.js que corre en localhost usando Cloudflare Tunnel (cloudflared).

## ¿Qué es Cloudflare Tunnel?

Cloudflare Tunnel es una herramienta que permite exponer servicios locales a internet de forma segura **sin necesidad de abrir puertos en tu router/firewall**. Es gratuito y muy fácil de usar.

## Ventajas

- ✅ **Gratuito** (plan gratuito disponible)
- ✅ **No necesitas abrir puertos** en tu router
- ✅ **HTTPS automático** (certificado SSL incluido)
- ✅ **Seguro** (conexión encriptada)
- ✅ **Fácil de configurar**
- ✅ **Dominio personalizado** (opcional)

## Requisitos Previos

1. Cuenta en Cloudflare (gratuita)
2. Un dominio configurado en Cloudflare (opcional, pero recomendado)
3. La aplicación corriendo en localhost

## Instalación

### Windows

1. Descargar cloudflared desde: https://github.com/cloudflare/cloudflared/releases
2. Descargar `cloudflared-windows-amd64.exe`
3. Renombrar a `cloudflared.exe` y mover a una carpeta en tu PATH (ej: `C:\Windows\System32\`)

O usar Chocolatey:
```powershell
choco install cloudflared
```

### Linux/Mac

```bash
# Linux
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
chmod +x cloudflared-linux-amd64
sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared

# Mac
brew install cloudflared
```

## Configuración Rápida (Sin Dominio)

### Opción 1: URL Temporal (Más Rápido)

```bash
# Ejecutar el túnel (la aplicación debe estar corriendo en localhost:3000)
cloudflared tunnel --url http://localhost:3000
```

Esto te dará una URL temporal como: `https://random-name.trycloudflare.com`

**Ventajas:**
- ✅ No requiere configuración
- ✅ Funciona inmediatamente
- ✅ HTTPS automático

**Desventajas:**
- ❌ URL cambia cada vez que reinicias
- ❌ No es permanente

### Opción 2: URL Permanente con Dominio (Recomendado)

#### Paso 1: Autenticarse en Cloudflare

```bash
cloudflared tunnel login
```

Esto abrirá tu navegador para autenticarte con Cloudflare.

#### Paso 2: Crear un Túnel

```bash
cloudflared tunnel create gestion-imprenta
```

Esto crea un túnel llamado "gestion-imprenta" y guarda las credenciales.

#### Paso 3: Crear Configuración

Crea un archivo de configuración en:
- **Windows**: `C:\Users\<tu-usuario>\.cloudflared\config.yml`
- **Linux/Mac**: `~/.cloudflared/config.yml`

```yaml
tunnel: <tunnel-id>  # El ID que te dio el comando anterior
credentials-file: C:\Users\<tu-usuario>\.cloudflared\<tunnel-id>.json

ingress:
  - hostname: gestion-imprenta.tu-dominio.com  # Tu subdominio
    service: http://localhost:3000
  - service: http_status:404
```

#### Paso 4: Crear Registro DNS

```bash
cloudflared tunnel route dns gestion-imprenta gestion-imprenta.tu-dominio.com
```

O manualmente en el panel de Cloudflare:
- Tipo: CNAME
- Nombre: gestion-imprenta
- Contenido: `<tunnel-id>.cfargotunnel.com`

#### Paso 5: Ejecutar el Túnel

```bash
cloudflared tunnel run gestion-imprenta
```

## Configuración para Producción (Como Servicio)

### Windows (Servicio)

1. Crear archivo `C:\Users\<tu-usuario>\.cloudflared\config.yml` (como arriba)

2. Instalar como servicio:
```powershell
cloudflared service install
```

3. Iniciar el servicio:
```powershell
net start cloudflared
```

### Linux (systemd)

1. Crear archivo `/etc/cloudflared/config.yml`:
```yaml
tunnel: <tunnel-id>
credentials-file: /etc/cloudflared/<tunnel-id>.json

ingress:
  - hostname: gestion-imprenta.tu-dominio.com
    service: http://localhost:3000
  - service: http_status:404
```

2. Copiar credenciales:
```bash
sudo cp ~/.cloudflared/<tunnel-id>.json /etc/cloudflared/
```

3. Instalar servicio:
```bash
sudo cloudflared service install
```

4. Iniciar servicio:
```bash
sudo systemctl start cloudflared
sudo systemctl enable cloudflared  # Para iniciar automáticamente
```

## Scripts de Inicio Automático

### Windows (PowerShell)

Crea `start-tunnel.ps1`:

```powershell
# Iniciar la aplicación Next.js
Start-Process -NoNewWindow npm -ArgumentList "start"

# Esperar a que la aplicación esté lista
Start-Sleep -Seconds 5

# Iniciar Cloudflare Tunnel
cloudflared tunnel run gestion-imprenta
```

### Linux/Mac (Bash)

Crea `start-tunnel.sh`:

```bash
#!/bin/bash

# Iniciar la aplicación Next.js en background
npm start &
APP_PID=$!

# Esperar a que la aplicación esté lista
sleep 5

# Iniciar Cloudflare Tunnel
cloudflared tunnel run gestion-imprenta

# Si el túnel se cierra, cerrar también la app
kill $APP_PID
```

Hacer ejecutable:
```bash
chmod +x start-tunnel.sh
```

## Configuración con Docker

Si tu aplicación está en Docker, puedes usar:

```yaml
# docker-compose.yml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}

  cloudflared:
    image: cloudflare/cloudflared:latest
    command: tunnel --no-autoupdate run gestion-imprenta
    volumes:
      - ~/.cloudflared:/etc/cloudflared
    depends_on:
      - web
    restart: unless-stopped
```

## Verificación

1. Verificar que el túnel está corriendo:
```bash
cloudflared tunnel list
```

2. Ver logs del túnel:
```bash
cloudflared tunnel info gestion-imprenta
```

3. Acceder a tu aplicación:
   - URL temporal: La que te dio `cloudflared tunnel --url`
   - URL permanente: `https://gestion-imprenta.tu-dominio.com`

## Solución de Problemas

### El túnel no se conecta

1. Verificar que la aplicación está corriendo en `localhost:3000`
2. Verificar que el túnel está autenticado: `cloudflared tunnel list`
3. Revisar logs: `cloudflared tunnel run gestion-imprenta --loglevel debug`

### Error de DNS

1. Verificar que el registro CNAME está correcto en Cloudflare
2. Esperar unos minutos para que el DNS se propague
3. Verificar con: `nslookup gestion-imprenta.tu-dominio.com`

### La aplicación no carga

1. Verificar que la aplicación responde en `http://localhost:3000`
2. Verificar que el túnel está apuntando al puerto correcto
3. Revisar los logs del túnel para errores

## Seguridad

### Autenticación Adicional (Opcional)

Puedes agregar autenticación con Cloudflare Access:

1. En el panel de Cloudflare, ir a **Zero Trust** > **Access** > **Applications**
2. Crear una nueva aplicación
3. Configurar políticas de acceso (email, dominio, etc.)
4. El túnel aplicará estas políticas automáticamente

### Restringir por IP (Opcional)

En el panel de Cloudflare:
1. Ir a **Security** > **WAF**
2. Crear regla para permitir solo ciertas IPs

## Comandos Útiles

```bash
# Listar túneles
cloudflared tunnel list

# Ver información de un túnel
cloudflared tunnel info gestion-imprenta

# Eliminar un túnel
cloudflared tunnel delete gestion-imprenta

# Ver rutas DNS
cloudflared tunnel route dns list

# Ejecutar con logs detallados
cloudflared tunnel run gestion-imprenta --loglevel debug
```

## Ejemplo Completo: Script de Inicio (Windows)

Crea `start-with-tunnel.bat`:

```batch
@echo off
echo Iniciando aplicacion y Cloudflare Tunnel...

REM Iniciar Next.js en una nueva ventana
start "Next.js App" cmd /k "npm start"

REM Esperar a que la aplicacion este lista
timeout /t 10 /nobreak

REM Iniciar Cloudflare Tunnel
echo Iniciando Cloudflare Tunnel...
cloudflared tunnel run gestion-imprenta

pause
```

## Notas Importantes

1. **La aplicación debe estar corriendo** antes de iniciar el túnel
2. **El túnel necesita estar activo** para que la URL funcione
3. **Para producción**, considera usar un servicio como systemd o Windows Service
4. **El plan gratuito** tiene límites, pero son generosos para uso personal/pequeño

## Recursos

- Documentación oficial: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/
- GitHub: https://github.com/cloudflare/cloudflared
- Panel de Cloudflare: https://dash.cloudflare.com/

