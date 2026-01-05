# Generar Instalador de la Aplicación

Este documento explica cómo generar un instalador para la aplicación de Gestión de Facturas.

## Instrucciones Rápidas

### 1. Instalar Rust

**Windows:**
1. Descarga e instala desde: https://rustup.rs/
2. Ejecuta `rustup-init.exe`
3. Reinicia la terminal

**Linux/Mac:**
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### 2. Instalar Dependencias del Sistema

**Windows:**
- Instala Visual Studio Build Tools desde: https://visualstudio.microsoft.com/downloads/
- Selecciona "Desktop development with C++" durante la instalación

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.0-dev build-essential curl wget libssl-dev libgtk-3-dev
```

**macOS:**
```bash
xcode-select --install
```

### 3. Instalar Dependencias del Proyecto

```bash
npm install
```

### 4. Generar el Instalador

```bash
npm run tauri:build
```

## Ubicación de los Instaladores

Después de ejecutar `npm run tauri:build`, encontrarás los instaladores en:

- **Windows**: `src-tauri/target/release/bundle/msi/`
- **macOS**: `src-tauri/target/release/bundle/macos/`
- **Linux**: `src-tauri/target/release/bundle/deb/` o `rpm/`

## Desarrollo con Tauri

Para probar la aplicación en modo desarrollo:

```bash
npm run tauri:dev
```

Esto abrirá una ventana de escritorio con la aplicación funcionando.

## Personalización

### Cambiar el Ícono

Los íconos están en `src-tauri/icons/`. Reemplaza estos archivos:
- `32x32.png`
- `128x128.png`
- `128x128@2x.png`
- `icon.icns` (macOS)
- `icon.ico` (Windows)

### Cambiar el Nombre de la Aplicación

Edita `src-tauri/tauri.conf.json` y cambia:
```json
"productName": "Tu Nombre Aquí"
```

## Tiempo de Compilación

⚠️ **Nota**: La primera compilación puede tardar 10-30 minutos ya que necesita compilar Rust y todas las dependencias. Las compilaciones siguientes serán mucho más rápidas.

