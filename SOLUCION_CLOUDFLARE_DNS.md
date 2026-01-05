# Solución: Error DNS con Cloudflare Tunnel

## Problema

El error `DNS_PROBE_FINISHED_NXDOMAIN` o `ERR_NAME_NOT_RESOLVED` ocurre cuando tu DNS local no puede resolver el dominio de Cloudflare Tunnel.

## Soluciones

### Solución 1: Cambiar DNS Temporalmente (Más Rápido)

1. **Abrir Configuración de Red de Windows:**
   - Click derecho en el ícono de red (esquina inferior derecha)
   - Seleccionar "Configuración de red e Internet"
   - Ir a "Ethernet" o "Wi-Fi" según tu conexión
   - Click en "Cambiar opciones del adaptador"

2. **Cambiar DNS:**
   - Click derecho en tu adaptador de red activo
   - Seleccionar "Propiedades"
   - Seleccionar "Protocolo de Internet versión 4 (TCP/IPv4)"
   - Click en "Propiedades"
   - Seleccionar "Usar las siguientes direcciones de servidor DNS"
   - DNS preferido: `8.8.8.8`
   - DNS alternativo: `8.8.4.4`
   - Click "Aceptar"

3. **Limpiar caché DNS:**
   ```powershell
   ipconfig /flushdns
   ```

4. **Probar la URL nuevamente**

### Solución 2: Usar DNS desde Línea de Comandos

```powershell
# Limpiar caché DNS
ipconfig /flushdns

# Probar con DNS de Google
nslookup flyer-order-despite-attractions.trycloudflare.com 8.8.8.8
```

### Solución 3: Esperar Propagación DNS

Las URLs temporales de Cloudflare a veces tardan 2-5 minutos en estar disponibles. Espera unos minutos y vuelve a intentar.

### Solución 4: Usar localhost:3000 (Funciona Siempre)

Mientras tanto, puedes usar:
```
http://localhost:3000
```

## Verificar que el Túnel Está Funcionando

```powershell
# Ver logs del túnel
docker-compose -f docker-compose.cloudflared.yml logs cloudflared

# Ver la URL generada
docker-compose -f docker-compose.cloudflared.yml logs cloudflared | Select-String "https://"
```

## Nota Importante

Las URLs temporales de Cloudflare (`*.trycloudflare.com`) son **temporales** y cambian cada vez que reinicias el contenedor. Para una URL permanente, necesitas configurar un túnel con dominio (ver `README_DOCKER_CLOUDFLARE.md`).

