# Configuración de Tauri para Generar Instalador

Este proyecto está configurado para generar instaladores de escritorio usando Tauri.

## Prerrequisitos

Antes de construir el instalador, necesitas instalar:

### 1. Rust

Visita https://rustup.rs/ y sigue las instrucciones para tu sistema operativo.

En Windows, descarga y ejecuta `rustup-init.exe`

En Linux/Mac:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### 2. Dependencias del Sistema

#### Windows
- Instala Visual Studio Build Tools con el workload "Desktop development with C++"

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.0-dev \
    build-essential \
    curl \
    wget \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev
```

#### macOS
```bash
xcode-select --install
```

## Instalación de Dependencias

1. Instala las dependencias de Node.js:
```bash
npm install
```

2. Verifica que Rust esté instalado:
```bash
rustc --version
cargo --version
```

## Desarrollo

Para ejecutar la aplicación en modo desarrollo con Tauri:

```bash
npm run tauri:dev
```

Esto abrirá una ventana de escritorio con la aplicación.

## Generar Instalador

Para generar el instalador:

```bash
npm run tauri:build
```

### Ubicación de los Instaladores

Después de la compilación, encontrarás los instaladores en:

- **Windows**: `src-tauri/target/release/bundle/msi/gestion-imprenta_0.1.0_x64_en-US.msi`
- **macOS**: `src-tauri/target/release/bundle/macos/Gestión de Facturas.app`
- **Linux**: `src-tauri/target/release/bundle/deb/gestion-imprenta_0.1.0_amd64.deb`

## Personalización

### Cambiar el nombre de la aplicación

Edita `src-tauri/tauri.conf.json`:
```json
{
  "package": {
    "productName": "Tu Nombre de App",
    "version": "0.1.0"
  }
}
```

### Cambiar el ícono

Reemplaza los archivos en `src-tauri/icons/`:
- `32x32.png`
- `128x128.png`
- `128x128@2x.png`
- `icon.icns` (macOS)
- `icon.ico` (Windows)

Puedes generar estos íconos usando herramientas como:
- https://icon.kitchen/ (para generar desde un PNG/SVG)
- https://icoconvert.com/

### Cambiar el tamaño de la ventana

Edita `src-tauri/tauri.conf.json`:
```json
{
  "tauri": {
    "windows": [
      {
        "width": 1200,
        "height": 800,
        "minWidth": 800,
        "minHeight": 600
      }
    ]
  }
}
```

## Notas Importantes

1. **Base de datos SQLite**: La base de datos se creará en el directorio de datos de la aplicación según el sistema operativo:
   - Windows: `%APPDATA%\gestion-imprenta\facturas.db`
   - macOS: `~/Library/Application Support/gestion-imprenta/facturas.db`
   - Linux: `~/.config/gestion-imprenta/facturas.db`

2. **API Routes de Next.js**: Para que funcionen correctamente en Tauri, la aplicación se exporta como sitio estático. Las API routes funcionarán, pero necesitarás ajustar `lib/db.ts` para usar rutas relativas al ejecutable.

3. **Primera compilación**: La primera vez que ejecutes `tauri:build`, puede tardar bastante tiempo ya que necesita compilar Rust y todas las dependencias.

## Solución de Problemas

### Error: "command not found: tauri"
Asegúrate de haber ejecutado `npm install` para instalar las dependencias.

### Error de compilación de Rust
Verifica que Rust esté correctamente instalado:
```bash
rustc --version
```

### Error en Windows sobre herramientas de compilación
Instala Visual Studio Build Tools desde: https://visualstudio.microsoft.com/downloads/

### La aplicación no se abre
Revisa la consola para errores. En desarrollo, ejecuta:
```bash
npm run tauri:dev
```
Y revisa los logs en la terminal.

