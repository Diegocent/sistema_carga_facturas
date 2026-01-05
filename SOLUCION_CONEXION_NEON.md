# Solución: Problema de Conexión a Neon desde Docker

## Problema Identificado

El contenedor Docker no puede conectarse a Neon PostgreSQL debido a:
- **Timeout de conexión muy corto** (2 segundos)
- **Posible bloqueo de firewall/red** para conexiones salientes a Neon

## Soluciones Aplicadas

### 1. ✅ Timeout Aumentado

Se aumentó el `connectionTimeoutMillis` de 2000ms a 10000ms (10 segundos) en `lib/db-neon.ts`.

### 2. 🔍 Verificar Conectividad

Si el problema persiste, puede ser un bloqueo de red/firewall. Prueba:

```bash
# Desde el contenedor, verificar si puede alcanzar Neon
docker exec gestion-imprenta-web nc -zv -w 5 ep-polished-hall-adp92fza-pooler.c-2.us-east-1.aws.neon.tech 5432
```

## Soluciones Alternativas

### Opción 1: Usar URL Directa (Sin Pooler)

Si el pooler está bloqueado, prueba con la URL directa de Neon:

1. Ve a tu dashboard de Neon
2. Obtén la **connection string directa** (no pooler)
3. Actualiza `.docker.env`:

```
DATABASE_URL=postgresql://usuario:password@ep-xxxxx.us-east-1.aws.neon.tech/neondb?sslmode=require
```

### Opción 2: Verificar Firewall

Si estás en una red corporativa o con firewall:

1. **Verifica que el puerto 5432 esté permitido** para conexiones salientes
2. **Verifica que no haya bloqueo de dominios** `.neon.tech`
3. **Prueba desde tu máquina local** (fuera de Docker) para confirmar que Neon funciona

### Opción 3: Usar VPN o Proxy

Si tu red bloquea conexiones a Neon:

1. Configura un proxy en Docker
2. O usa una VPN que permita conexiones a AWS (Neon está en AWS)

### Opción 4: Verificar Configuración de Neon

1. Ve a tu dashboard de Neon: https://console.neon.tech
2. Verifica que la base de datos esté activa
3. Verifica que no haya restricciones de IP
4. Prueba la conexión desde el dashboard

## Verificar que Funciona

Después de aplicar los cambios:

```bash
# Reiniciar el contenedor
docker-compose -f docker-compose.ngrok.yml restart web

# Ver logs
docker-compose -f docker-compose.ngrok.yml logs -f web

# Probar la API
curl http://localhost:3000/api/facturas
```

## Nota Importante

Si el problema persiste después de aumentar el timeout, es muy probable que sea un **bloqueo de red/firewall**. En ese caso:

1. **Prueba desde tu máquina local** (sin Docker) para confirmar
2. **Contacta a tu administrador de red** si estás en una red corporativa
3. **Considera usar un servicio de hosting** (Vercel, Railway, etc.) que tenga mejor conectividad

