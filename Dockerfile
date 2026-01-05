# Dockerfile para la aplicación web Next.js
# Esta imagen solo se usa para la aplicación web, NO para Tauri

FROM node:20-alpine AS base

# Instalar dependencias solo cuando sea necesario
FROM base AS deps
# Instalar herramientas de compilación necesarias para algunas dependencias nativas
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

# Copiar archivos de dependencias
COPY package.json package-lock.json* ./
# Instalar todas las dependencias (incluyendo devDependencies para el build)
RUN npm ci

# Reconstruir el código fuente solo cuando sea necesario
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variable de entorno para indicar que es build web (no Tauri)
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV DOCKER_BUILD=true

# Build de la aplicación Next.js
RUN npm run build

# Imagen de producción, copiar todos los archivos y ejecutar next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Crear usuario no-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar archivos necesarios
COPY --from=builder /app/public ./public

# Copiar package.json y package-lock.json
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json

# Instalar solo dependencias de producción (sin devDependencies)
RUN npm ci --omit=dev && npm cache clean --force

# Copiar archivos de Next.js
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next

# Asegurar permisos correctos
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Iniciar la aplicación
CMD ["node_modules/.bin/next", "start"]

