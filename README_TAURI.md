# Configuración de Tauri - Resumen Rápido

## ✅ Configuración Completada

El proyecto está configurado para generar instaladores con Tauri.

## 📦 Instalación

### 1. Instalar Rust

**Windows**: https://rustup.rs/
**Linux/Mac**: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`

### 2. Instalar Dependencias del Sistema

**Windows**: Visual Studio Build Tools con "Desktop development with C++"
**Linux**: `sudo apt install libwebkit2gtk-4.0-dev build-essential`
**macOS**: `xcode-select --install`

### 3. Instalar Dependencias del Proyecto

```bash
npm install
```

## 🚀 Uso

### Desarrollo
```bash
npm run tauri:dev
```

### Generar Instalador
```bash
npm run tauri:build
```

El instalador estará en: `src-tauri/target/release/bundle/`

## ⚠️ Limitación Importante

Las **API Routes de Next.js NO funcionan** con export estático en producción.

En desarrollo (`tauri:dev`) funcionan porque usa `localhost:3000`.

Para producción, necesitarás:
- Migrar API routes a comandos de Tauri, O
- Usar un servidor embebido

Ver `NOTA_TAURI_API.md` para más detalles.

