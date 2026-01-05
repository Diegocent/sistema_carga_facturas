# Guía Paso a Paso: Cambiar DNS en Windows 10/11

## Problema
Tu DNS local no puede resolver los dominios de Cloudflare Tunnel (`*.trycloudflare.com`), causando el error `DNS_PROBE_FINISHED_NXDOMAIN`.

## Solución: Cambiar a DNS de Google

### Método 1: Desde Configuración de Windows (Más Fácil)

1. **Abrir Configuración:**
   - Presiona `Win + I` (tecla Windows + I)
   - O click en el menú Inicio → Configuración (⚙️)

2. **Ir a Red:**
   - Click en **"Red e Internet"**
   - En el panel izquierdo, selecciona **"Ethernet"** o **"Wi-Fi"** (según tu conexión)

3. **Abrir Propiedades de la Conexión:**
   - Click en el nombre de tu conexión activa (ej: "Ethernet" o "Wi-Fi")
   - Scroll hacia abajo hasta **"Configuración de red"**
   - Click en **"Editar"** junto a **"Asignación de DNS"**

4. **Configurar DNS Manual:**
   - Cambia de **"Automático (DHCP)"** a **"Manual"**
   - Activa el switch de **"IPv4"**
   - En **"DNS preferido"** escribe: `8.8.8.8`
   - En **"DNS alternativo"** escribe: `8.8.4.4`
   - Click en **"Guardar"**

5. **Limpiar Caché DNS:**
   - Abre PowerShell como Administrador:
     - Click derecho en el menú Inicio
     - Selecciona **"Windows PowerShell (Administrador)"** o **"Terminal (Administrador)"**
   - Ejecuta:
     ```powershell
     ipconfig /flushdns
     ```

6. **Reiniciar Navegador:**
   - Cierra completamente Chrome/Edge
   - Vuelve a abrirlo
   - Prueba la URL: `https://proud-outdoors-eve-east.trycloudflare.com`

### Método 2: Desde Panel de Control (Alternativo)

1. **Abrir Panel de Control:**
   - Presiona `Win + R`
   - Escribe: `ncpa.cpl`
   - Presiona Enter

2. **Abrir Propiedades:**
   - Click derecho en tu conexión activa (Ethernet o Wi-Fi)
   - Selecciona **"Propiedades"**

3. **Configurar DNS:**
   - Selecciona **"Protocolo de Internet versión 4 (TCP/IPv4)"**
   - Click en **"Propiedades"**
   - Selecciona **"Usar las siguientes direcciones de servidor DNS"**
   - DNS preferido: `8.8.8.8`
   - DNS alternativo: `8.8.4.4`
   - Click **"Aceptar"** en ambas ventanas

4. **Limpiar Caché DNS:**
   ```powershell
   ipconfig /flushdns
   ```

## Verificar que Funciona

Después de cambiar el DNS, verifica:

```powershell
# Probar resolución DNS
nslookup proud-outdoors-eve-east.trycloudflare.com 8.8.8.8
```

Deberías ver direcciones IP como:
- `104.16.230.132`
- `104.16.231.132`

## Si Aún No Funciona

### Opción A: Usar Ngrok (Más Confiable)

1. Crea cuenta gratuita en: https://dashboard.ngrok.com/signup
2. Obtén tu authtoken
3. Usa el archivo `docker-compose.ngrok.yml` que creé
4. Ver instrucciones en `SOLUCION_DNS_ALTERNATIVA.md`

### Opción B: Usar localhost:3000

Mientras tanto, puedes usar:
```
http://localhost:3000
```

## Nota Importante

- Los cambios de DNS son **reversibles**
- Puedes volver a "Automático (DHCP)" cuando quieras
- Google DNS (8.8.8.8) es público y confiable, usado por millones de usuarios

