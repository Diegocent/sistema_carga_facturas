# Solución Alternativa: Usar Ngrok en lugar de Cloudflare Tunnel

Si Cloudflare Tunnel no funciona debido a problemas de DNS, puedes usar **Ngrok** que es más confiable para URLs temporales.

## Ventajas de Ngrok

- ✅ **Más confiable** para URLs temporales
- ✅ **DNS funciona inmediatamente** (no requiere cambios)
- ✅ **URLs más estables** durante la sesión
- ✅ **Fácil de usar**

## Desventajas

- ❌ Requiere cuenta gratuita (muy fácil de crear)
- ❌ URLs temporales cambian al reiniciar (igual que Cloudflare)

## Opción 1: Usar Ngrok con Docker (Recomendado)

### Paso 1: Crear cuenta en Ngrok (Gratis)

1. Ve a: https://dashboard.ngrok.com/signup
2. Crea una cuenta gratuita
3. Obtén tu authtoken desde: https://dashboard.ngrok.com/get-started/your-authtoken

### Paso 2: Configurar Ngrok

Crea un archivo `.ngrok.env`:

```bash
NGROK_AUTHTOKEN=tu_authtoken_aqui
```

### Paso 3: Actualizar docker-compose.ngrok.yml

Agrega la variable de entorno:

```yaml
ngrok:
  environment:
    - NGROK_AUTHTOKEN=${NGROK_AUTHTOKEN}
```

### Paso 4: Ejecutar

```bash
docker-compose -f docker-compose.ngrok.yml up -d
```

### Paso 5: Ver la URL

```bash
docker-compose -f docker-compose.ngrok.yml logs ngrok
```

La URL aparecerá como: `https://xxxx-xxxx-xxxx.ngrok-free.app`

## Opción 2: Usar Ngrok desde tu máquina (Sin Docker)

### Instalación

```powershell
# Con Chocolatey
choco install ngrok

# O descargar desde: https://ngrok.com/download
```

### Uso

```bash
# Configurar authtoken (solo una vez)
ngrok config add-authtoken tu_authtoken

# Iniciar túnel
ngrok http 3000
```

Esto te dará una URL como: `https://xxxx-xxxx-xxxx.ngrok-free.app`

## Opción 3: Solucionar DNS de Cloudflare (Si prefieres seguir con Cloudflare)

### Cambiar DNS en Windows:

1. **Abrir Configuración:**
   - Presiona `Win + I`
   - Ve a "Red e Internet" → "Ethernet" o "Wi-Fi"
   - Click en tu conexión activa
   - Click en "Editar" en "Asignación de DNS"

2. **Configurar DNS Manual:**
   - Seleccionar "Manual"
   - IPv4: Activar
   - DNS preferido: `8.8.8.8`
   - DNS alternativo: `8.8.4.4`
   - Guardar

3. **Limpiar caché DNS:**
   ```powershell
   ipconfig /flushdns
   ```

4. **Reiniciar navegador** y probar la URL

## Comparación

| Característica | Cloudflare Tunnel | Ngrok |
|---------------|-------------------|-------|
| Gratis | ✅ Sí | ✅ Sí (con límites) |
| Requiere cuenta | ❌ No (URLs temporales) | ✅ Sí (gratis) |
| DNS inmediato | ❌ A veces tarda | ✅ Funciona siempre |
| URL permanente | ✅ Con dominio | ✅ Con plan pago |
| Fácil de usar | ✅ | ✅ |

## Recomendación

Para uso inmediato: **Usa Ngrok** (más confiable)
Para producción: **Configura Cloudflare Tunnel con dominio** (más profesional)

