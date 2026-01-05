# Docker - Despliegue de la Aplicación Web

Este documento explica cómo desplegar la aplicación web usando Docker.

## ⚠️ Importante

- **La aplicación web SOLO usa Neon PostgreSQL**, nunca SQLite
- **SQLite solo se usa en la aplicación Tauri** (desktop)
- En Docker, la aplicación web está completamente separada de Tauri

## Requisitos Previos

- Docker instalado
- Docker Compose instalado (opcional, pero recomendado)
- Variable de entorno `DATABASE_URL` con la conexión a Neon PostgreSQL

## Configuración Rápida

### 1. Configurar Variables de Entorno

Crea un archivo `.docker.env` con tu configuración:

```bash
cp .docker.env.example .docker.env
```

Edita `.docker.env` y configura tu `DATABASE_URL` de Neon PostgreSQL.

### 2. Construir y Ejecutar con Docker Compose

```bash
docker-compose up -d --build
```

La aplicación estará disponible en `http://localhost:3000`

### 3. Construir y Ejecutar con Docker directamente

```bash
# Construir la imagen
docker build -t gestion-imprenta-web .

# Ejecutar el contenedor
docker run -d \
  --name gestion-imprenta-web \
  -p 3000:3000 \
  --env-file .docker.env \
  gestion-imprenta-web
```

## Comandos Útiles

### Ver logs del contenedor
```bash
docker-compose logs -f web
```

### Detener la aplicación
```bash
docker-compose down
```

### Reiniciar la aplicación
```bash
docker-compose restart
```

### Acceder al contenedor
```bash
docker exec -it gestion-imprenta-web sh
```

## Verificación

Una vez desplegada, verifica que:

1. La aplicación responde en `http://localhost:3000`
2. La aplicación se conecta correctamente a Neon PostgreSQL
3. No hay intentos de usar SQLite (revisa los logs)

## Cloudflare Tunnel (Exponer Aplicación Local)

### Opción 1: URL Temporal (Más Fácil)

Usa el archivo `docker-compose.cloudflared.yml`:

```bash
docker-compose -f docker-compose.cloudflared.yml up --build
```

Esto iniciará:
- La aplicación web en el contenedor
- Cloudflare Tunnel con URL temporal

La URL temporal aparecerá en los logs del contenedor `cloudflared`.

### Opción 2: Túnel Permanente (Con Dominio)

1. **Configurar túnel localmente primero:**
   ```bash
   cloudflared tunnel login
   cloudflared tunnel create gestion-imprenta
   ```

2. **Configurar DNS:**
   ```bash
   cloudflared tunnel route dns gestion-imprenta gestion-imprenta.tu-dominio.com
   ```

3. **Copiar credenciales al directorio del proyecto:**
   ```bash
   # Windows
   mkdir .cloudflared
   copy %USERPROFILE%\.cloudflared\<tunnel-id>.json .cloudflared\
   
   # Linux/Mac
   mkdir .cloudflared
   cp ~/.cloudflared/<tunnel-id>.json .cloudflared/
   ```

4. **Crear archivo `.cloudflared/config.yml`:**
   ```yaml
   tunnel: <tunnel-id>
   credentials-file: /etc/cloudflared/<tunnel-id>.json
   
   ingress:
     - hostname: gestion-imprenta.tu-dominio.com
       service: http://web:3000
     - service: http_status:404
   ```

5. **Ejecutar con docker-compose:**
   ```bash
   docker-compose --profile permanent up -d
   ```

### Ver Logs del Túnel

```bash
# URL temporal
docker-compose -f docker-compose.cloudflared.yml logs cloudflared

# Túnel permanente
docker-compose logs cloudflared
```

## Solución de Problemas

### Error de conexión a la base de datos

Verifica que:
- La variable `DATABASE_URL` esté correctamente configurada
- La base de datos Neon esté accesible desde el servidor
- El formato de la URL sea correcto: `postgresql://usuario:password@host:puerto/database?sslmode=require`

### Error en el build

Si el build falla, verifica:
- Que todas las dependencias estén en `package.json`
- Que no haya errores de TypeScript
- Que el archivo `next.config.js` esté correctamente configurado

### La aplicación no inicia

Revisa los logs:
```bash
docker-compose logs web
```

### Cloudflare Tunnel no se conecta

1. Verifica que el servicio `web` esté saludable:
   ```bash
   docker-compose ps
   ```

2. Verifica los logs del túnel:
   ```bash
   docker-compose logs cloudflared
   ```

3. Asegúrate de que el túnel puede acceder al servicio web:
   - Verifica que ambos están en la misma red Docker
   - Verifica que el nombre del servicio es `web` (no `gestion-imprenta-web`)

## Producción

Para producción, considera:

1. **Usar un reverse proxy** (nginx, traefik, etc.)
2. **Configurar HTTPS** con certificados SSL
3. **Usar variables de entorno seguras** (no hardcodeadas)
4. **Configurar monitoreo** y alertas
5. **Hacer backup regular** de la base de datos Neon

## Notas

- La aplicación web NO incluye código de Tauri
- La aplicación web NO intenta usar SQLite
- Todos los datos se almacenan en Neon PostgreSQL
- El contenedor se ejecuta como usuario no-root por seguridad

