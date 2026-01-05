# Guía de Uso: Ngrok

## ✅ Configuración Completada

Ngrok está configurado y funcionando. Tu aplicación está expuesta públicamente.

## 🌐 URL Pública

```
https://vallie-nontranscribing-secretively.ngrok-free.dev
```

**Nota:** Esta URL cambia cada vez que reinicias el contenedor. Para una URL fija, necesitas un plan de pago de Ngrok.

## 📊 Dashboard de Ngrok

Puedes ver estadísticas, requests, y logs en tiempo real en:

```
http://localhost:4040
```

## 🚀 Comandos Útiles

### Ver la URL actual:
```bash
docker-compose -f docker-compose.ngrok.yml logs ngrok | Select-String "https://"
```

### Ver estado de los contenedores:
```bash
docker-compose -f docker-compose.ngrok.yml ps
```

### Ver logs en tiempo real:
```bash
docker-compose -f docker-compose.ngrok.yml logs -f ngrok
```

### Detener Ngrok:
```bash
docker-compose -f docker-compose.ngrok.yml down
```

### Reiniciar Ngrok:
```bash
docker-compose -f docker-compose.ngrok.yml restart ngrok
```

## 🔧 Configuración

El authtoken está guardado en `.ngrok.env`:
```
NGROK_AUTHTOKEN=37ow31tdwqN2fwTPdfzjs1p2Cbo_7yVAbvviZHWa1X7VxnbaG
```

## 📝 Notas Importantes

1. **URL Temporal:** La URL cambia cada vez que reinicias el contenedor
2. **Límites Gratuitos:** 
   - 1 túnel simultáneo
   - 40 conexiones por minuto
   - 1 GB de tráfico por mes
3. **Sin Página de Advertencia:** A diferencia de LocalTunnel, Ngrok no muestra página de advertencia
4. **Dashboard:** Accede a `http://localhost:4040` para ver requests en tiempo real

## 🎯 Comparación con LocalTunnel

| Característica | Ngrok | LocalTunnel |
|---------------|-------|-------------|
| Página de advertencia | ❌ No | ✅ Sí |
| Dashboard | ✅ Sí (4040) | ❌ No |
| URL estable | ❌ Cambia | ❌ Cambia |
| Requiere cuenta | ✅ Sí (gratis) | ❌ No |
| Confiabilidad | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

## 🔄 Cambiar a URL Fija (Opcional)

Si necesitas una URL que no cambie, puedes:

1. **Opción 1:** Usar un subdominio personalizado (requiere plan de pago)
2. **Opción 2:** Usar Vercel para deploy permanente (gratis para Next.js)

## 🆘 Solución de Problemas

### Si la URL no funciona:

1. Verifica que los contenedores estén corriendo:
   ```bash
   docker-compose -f docker-compose.ngrok.yml ps
   ```

2. Verifica los logs:
   ```bash
   docker-compose -f docker-compose.ngrok.yml logs ngrok
   ```

3. Reinicia los servicios:
   ```bash
   docker-compose -f docker-compose.ngrok.yml restart
   ```

