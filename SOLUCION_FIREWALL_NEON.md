# ⚠️ Problema: Firewall/Red Bloqueando Conexión a Neon

## Diagnóstico

El contenedor Docker **NO puede conectarse** a Neon PostgreSQL:
- ❌ Puerto 5432 bloqueado o inaccesible
- ❌ Timeout de conexión
- ✅ Internet funciona (puede acceder a Google)
- ❌ Neon no es accesible desde Docker

## Soluciones

### 🔧 Solución 1: Probar desde tu Máquina Local (Fuera de Docker)

Primero, verifica si el problema es solo de Docker o también de tu red:

```bash
# Instalar psql si no lo tienes
# Windows: descargar desde https://www.postgresql.org/download/windows/

# Probar conexión directa
psql "postgresql://neondb_owner:npg_Kt4oRPeVIE0a@ep-polished-hall-adp92fza-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
```

**Si funciona desde tu máquina pero no desde Docker:**
- El problema es específico de Docker/red del contenedor
- Ver Solución 2

**Si NO funciona desde tu máquina:**
- Tu red/firewall está bloqueando Neon
- Ver Solución 3

### 🔧 Solución 2: Usar URL Directa (Sin Pooler)

El pooler puede estar bloqueado. Prueba con la URL directa:

1. Ve a tu dashboard de Neon: https://console.neon.tech
2. Selecciona tu proyecto
3. Ve a "Connection Details"
4. Copia la **"Direct connection"** (no pooler)
5. Actualiza `.docker.env`:

```env
DATABASE_URL=postgresql://neondb_owner:npg_Kt4oRPeVIE0a@ep-polished-hall-adp92fza.us-east-1.aws.neon.tech/neondb?sslmode=require
```

Nota: Quita `-pooler` de la URL.

### 🔧 Solución 3: Configurar Firewall/Red

Si tu red bloquea Neon:

#### Opción A: Permitir Puerto 5432 Saliente
- Configura tu firewall para permitir conexiones salientes al puerto 5432
- Permite dominios `*.neon.tech` y `*.aws.neon.tech`

#### Opción B: Usar VPN
- Conecta a una VPN que permita conexiones a AWS (Neon está en AWS)

#### Opción C: Usar Proxy en Docker
Configura un proxy HTTP en Docker (si tienes uno disponible).

### 🔧 Solución 4: Deploy en Servicio de Hosting (Recomendado)

En lugar de Docker local, deploya en un servicio que tenga mejor conectividad:

#### Vercel (Gratis, Perfecto para Next.js):
```bash
npm i -g vercel
vercel
```

#### Railway (Gratis con límites):
1. Ve a https://railway.app
2. Conecta tu repositorio
3. Configura `DATABASE_URL` como variable de entorno
4. Deploy automático

#### Render (Gratis):
1. Ve a https://render.com
2. Conecta tu repositorio
3. Configura variables de entorno
4. Deploy

### 🔧 Solución 5: Usar Base de Datos Local en Docker

Como solución temporal, puedes usar PostgreSQL local en Docker:

```yaml
# docker-compose.ngrok.yml - Agregar servicio PostgreSQL
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: neondb
      POSTGRES_USER: neondb_owner
      POSTGRES_PASSWORD: npg_Kt4oRPeVIE0a
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - app-network

volumes:
  postgres_data:
```

Y actualizar `.docker.env`:
```env
DATABASE_URL=postgresql://neondb_owner:npg_Kt4oRPeVIE0a@postgres:5432/neondb
```

**Nota:** Esto crea una base de datos local, no conectada a Neon.

## 🎯 Recomendación

**Para producción/demo con cliente:**
👉 **Usa Vercel** - Es gratis, perfecto para Next.js, y tiene excelente conectividad a Neon.

**Para desarrollo local:**
👉 **Verifica tu firewall/red** y permite conexiones a Neon.

## Verificar Estado Actual

```bash
# Ver logs del contenedor
docker-compose -f docker-compose.ngrok.yml logs web

# Probar conectividad
docker exec gestion-imprenta-web nc -zv -w 10 ep-polished-hall-adp92fza-pooler.c-2.us-east-1.aws.neon.tech 5432
```

