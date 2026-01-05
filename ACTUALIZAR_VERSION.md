# Guía para Actualizar la Versión

Para actualizar la versión de la aplicación y generar un nuevo instalador que reemplace la versión anterior, sigue estos pasos:

## Pasos para Actualizar la Versión

1. **Actualizar `package.json`**
   ```json
   "version": "0.1.X"  // Incrementar el número
   ```

2. **Actualizar `src-tauri/Cargo.toml`**
   ```toml
   version = "0.1.X"  // Mismo número que package.json
   ```

3. **Actualizar `src-tauri/tauri.conf.json`**
   ```json
   "version": "0.1.X"  // Mismo número que los anteriores
   ```

4. **Generar el nuevo instalador**
   ```bash
   npm run tauri:build
   ```

## Convenciones de Versionado

- **MAJOR.MINOR.PATCH** (ejemplo: 1.2.3)
  - **MAJOR**: Cambios incompatibles
  - **MINOR**: Nuevas funcionalidades compatibles
  - **PATCH**: Correcciones de errores

### Ejemplos:
- `0.1.0` → `0.1.1` (corrección menor)
- `0.1.1` → `0.2.0` (nueva funcionalidad)
- `0.2.0` → `1.0.0` (versión estable)

## Notas Importantes

- Los instaladores generados reemplazarán versiones anteriores automáticamente
- El identificador de la aplicación (`com.gestionimprenta.app`) debe permanecer igual
- Los usuarios pueden instalar la nueva versión sobre la anterior sin problemas

## Ubicación de los Instaladores

Después de `npm run tauri:build`, los instaladores estarán en:
- MSI: `src-tauri/target/release/bundle/msi/`
- NSIS: `src-tauri/target/release/bundle/nsis/`

