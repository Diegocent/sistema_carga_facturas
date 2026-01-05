# Solución: Contraseña del Túnel LocalTunnel

## ¿Qué es la contraseña del túnel?

La contraseña del túnel es tu **IP pública**. LocalTunnel muestra una página de advertencia la primera vez que alguien accede desde un navegador para prevenir abusos.

## Obtener tu IP Pública (Contraseña del Túnel)

### Opción 1: Desde tu navegador
Visita: https://loca.lt/mytunnelpassword

### Opción 2: Desde PowerShell
```powershell
Invoke-WebRequest -Uri "https://api.ipify.org" -UseBasicParsing | Select-Object -ExpandProperty Content
```

### Opción 3: Desde el contenedor Docker
```bash
docker exec gestion-imprenta-tunnel wget -qO- https://loca.lt/mytunnelpassword
```

## Cómo Compartir con tu Cliente

1. **Obtén tu IP pública** (usando uno de los métodos arriba)
2. **Comparte la URL y la contraseña:**
   - URL: `https://gestion-imprenta.loca.lt`
   - Contraseña: `[TU_IP_PUBLICA]` (ejemplo: `186.123.45.67`)

3. **Tu cliente debe:**
   - Ingresar la contraseña (tu IP pública) en la página
   - Después de eso, no verá la página de advertencia por 7 días desde su IP

## Evitar la Página de Advertencia (Para Desarrolladores)

### Opción 1: Usar un User-Agent personalizado

Puedes configurar tu aplicación Next.js para enviar un header personalizado. Sin embargo, esto solo funciona para requests desde tu aplicación, no para visitantes directos.

### Opción 2: Usar Ngrok (Sin página de advertencia)

Si prefieres evitar completamente esta página, puedes usar Ngrok:

```bash
# 1. Crear cuenta en: https://dashboard.ngrok.com/signup
# 2. Obtener authtoken
# 3. Usar docker-compose.ngrok.yml
```

### Opción 3: Aceptar la página (Recomendado)

La página de advertencia solo aparece:
- **Una vez por IP pública cada 7 días**
- **Solo en navegadores estándar**
- **No afecta webhooks o APIs**

Es una medida de seguridad razonable y no es muy molesta.

## Nota Importante

- La página de advertencia es una medida de seguridad de LocalTunnel
- No puedes eliminarla completamente para todos los visitantes
- Webhooks y APIs deberían funcionar directamente sin ver esta página
- Después de ingresar la contraseña una vez, no se verá por 7 días desde esa IP

