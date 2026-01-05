# ⚠️ Nota Importante: API Routes en Tauri

Cuando construyes la aplicación con Tauri usando `output: 'export'`, las **API Routes de Next.js NO funcionan** porque requieren un servidor Node.js.

## Soluciones

### Opción 1: Usar Comandos de Tauri (Recomendado)

Convierte las API routes a comandos de Tauri en Rust. Esto es más eficiente y nativo.

### Opción 2: Servidor Embebido

Mantén el servidor Next.js corriendo y úsalo con Tauri. Esto requiere configuración adicional.

### Opción 3: Desarrollo/Producción Separados

- **Desarrollo**: Usa `npm run dev` normalmente (API routes funcionan)
- **Producción con Tauri**: Convierte a comandos de Tauri o usa servidor embebido

## Estado Actual

Por ahora, la configuración está lista para:
- ✅ Desarrollo: `npm run tauri:dev` - API routes funcionan (usa localhost:3000)
- ⚠️ Producción: `npm run tauri:build` - API routes NO funcionan (export estático)

Para producción, necesitarás migrar las API routes a comandos de Tauri o usar otra solución.

