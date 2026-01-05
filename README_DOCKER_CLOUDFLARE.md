# Docker + Cloudflare Tunnel - Guía Completa

Esta guía explica cómo desplegar tu aplicación con Docker y exponerla usando Cloudflare Tunnel directamente desde el contenedor.

## 🚀 Inicio Rápido

### Opción 1: URL Temporal (Sin Configuración)

```bash
# 1. Configurar variables de entorno
cp .docker.env.example .docker.env
# Editar .docker.env con tu DATABASE_URL

# 2. Iniciar con Cloudflare Tunnel
docker-compose -f docker-compose.cloudflared.yml up --build

# 3. Ver la URL temporal en los logs
docker-compose -f docker-compose.cloudflared.yml logs cloudflared
```

La URL temporal aparecerá en los logs, algo como:
```
https://random-name.trycloudflare.com
```

### Opción 2: Túnel Permanente (Con Dominio)

#### Paso 1: Configurar Túnel Localmente

```bash
# Autenticarse
cloudflared tunnel login

# Crear túnel
cloudflared tunnel create gestion-imprenta

# Configurar DNS (si tienes dominio)
cloudflared tunnel route dns gestion-imprenta gestion-imprenta.tu-dominio.com
```

#### Paso 2: Preparar Archivos para Docker

```bash
# Crear directorio para configuración
mkdir .cloudflared

# Copiar credenciales (Windows)
copy %USERPROFILE%\.cloudflared\<tunnel-id>.json .cloudflared\

# Copiar credenciales (Linux/Mac)
cp ~/.cloudflared/<tunnel-id>.json .cloudflared/
```

#### Paso 3: Crear Configuración

Crea `.cloudflared/config.yml`:

```yaml
tunnel: <tunnel-id>  # El ID que te dio cloudflared tunnel create
credentials-file: /etc/cloudflared/<tunnel-id>.json

ingress:
  - hostname: gestion-imprenta.tu-dominio.com
    service: http://web:3000
  - service: http_status:404
```

#### Paso 4: Ejecutar con Docker Compose

```bash
# Usar el docker-compose.yml principal con perfil permanent
docker-compose --profile permanent up -d --build
```

## 📋 Archivos de Configuración

### docker-compose.cloudflared.yml

Este archivo incluye:
- ✅ Aplicación web (Next.js)
- ✅ Cloudflare Tunnel con URL temporal
- ✅ Red Docker interna
- ✅ Healthcheck para esperar a que la app esté lista

### docker-compose.yml (Principal)

Este archivo tiene perfiles:
- **Sin perfil**: Solo la aplicación web (puerto 3000 expuesto)
- **`--profile temp`**: Aplicación + Tunnel temporal
- **`--profile permanent`**: Aplicación + Tunnel permanente

## 🔧 Comandos Útiles

### Ver Logs

```bash
# Logs de la aplicación
docker-compose logs -f web

# Logs del túnel
docker-compose logs -f cloudflared

# Todos los logs
docker-compose logs -f
```

### Detener Servicios

```bash
# Detener todo
docker-compose down

# Detener solo el túnel
docker-compose stop cloudflared
```

### Reiniciar

```bash
# Reiniciar todo
docker-compose restart

# Reiniciar solo el túnel
docker-compose restart cloudflared
```

## 🌐 Configuración de Red

Los contenedores se comunican a través de una red Docker interna:

- **Aplicación web**: `http://web:3000` (nombre del servicio)
- **Cloudflare Tunnel**: Accede a `web:3000` internamente
- **Puerto 3000**: NO se expone al host (solo accesible vía túnel)

## 🔒 Seguridad

### Ventajas de Usar Docker + Cloudflare Tunnel

1. **Aislamiento**: La aplicación no expone puertos al host
2. **HTTPS Automático**: Cloudflare proporciona certificado SSL
3. **Sin Abrir Puertos**: No necesitas configurar firewall/router
4. **Fácil de Desplegar**: Todo en un solo comando

### Autenticación Adicional (Opcional)

Puedes agregar Cloudflare Access para autenticación:

1. En Cloudflare Dashboard: **Zero Trust** > **Access** > **Applications**
2. Crear aplicación para `gestion-imprenta.tu-dominio.com`
3. Configurar políticas (email, dominio, etc.)
4. El túnel aplicará estas políticas automáticamente

## 🐛 Solución de Problemas

### El túnel no se conecta

1. **Verificar que la app está lista:**
   ```bash
   docker-compose ps
   # Debe mostrar "healthy" para el servicio web
   ```

2. **Verificar logs:**
   ```bash
   docker-compose logs web
   docker-compose logs cloudflared
   ```

3. **Verificar red Docker:**
   ```bash
   docker network inspect gestion-imprenta_app-network
   ```

### Error: "tunnel not found"

Si usas túnel permanente:
1. Verifica que el archivo `.cloudflared/<tunnel-id>.json` existe
2. Verifica que `config.yml` tiene el `tunnel-id` correcto
3. Verifica que los archivos están montados correctamente en el contenedor

### La URL no carga

1. **Verificar que el túnel está corriendo:**
   ```bash
   docker-compose ps cloudflared
   ```

2. **Verificar logs del túnel:**
   ```bash
   docker-compose logs cloudflared
   ```

3. **Verificar que la app responde internamente:**
   ```bash
   docker-compose exec web wget -qO- http://localhost:3000
   ```

### Error de DNS (túnel permanente)

1. Verifica que el registro CNAME está correcto en Cloudflare
2. Espera unos minutos para propagación DNS
3. Verifica con: `nslookup gestion-imprenta.tu-dominio.com`

## 📊 Monitoreo

### Ver Estado de los Contenedores

```bash
docker-compose ps
```

### Ver Uso de Recursos

```bash
docker stats
```

### Ver Logs en Tiempo Real

```bash
docker-compose logs -f --tail=100
```

## 🚀 Producción

### Ejecutar como Servicio (Linux)

1. Crear servicio systemd `/etc/systemd/system/gestion-imprenta.service`:

```ini
[Unit]
Description=Gestión de Facturas con Cloudflare Tunnel
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/ruta/a/tu/proyecto
ExecStart=/usr/bin/docker-compose -f docker-compose.cloudflared.yml up -d
ExecStop=/usr/bin/docker-compose -f docker-compose.cloudflared.yml down
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

2. Habilitar y iniciar:
```bash
sudo systemctl enable gestion-imprenta
sudo systemctl start gestion-imprenta
```

### Backup de Configuración

Asegúrate de hacer backup de:
- `.cloudflared/<tunnel-id>.json` (credenciales del túnel)
- `.cloudflared/config.yml` (configuración del túnel)
- `.docker.env` (variables de entorno)

## 📝 Notas Importantes

1. **La aplicación NO expone puerto 3000** al host cuando usas Cloudflare Tunnel
2. **El túnel necesita estar activo** para que la URL funcione
3. **Para desarrollo local**, puedes usar `docker-compose.yml` sin perfiles (expone puerto 3000)
4. **Para producción**, usa `docker-compose.cloudflared.yml` o el perfil `permanent`

## 🔗 Recursos

- [Documentación Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [Docker Compose Profiles](https://docs.docker.com/compose/profiles/)
- [README Docker Principal](./README_DOCKER.md)

