@echo off
REM Script para iniciar la aplicación con Cloudflare Tunnel (Windows)
REM Asegúrate de tener cloudflared instalado y configurado

echo ========================================
echo  Iniciando Gestión de Facturas
echo  con Cloudflare Tunnel
echo ========================================
echo.

REM Verificar si cloudflared está instalado
where cloudflared >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: cloudflared no está instalado o no está en el PATH
    echo.
    echo Por favor instala cloudflared desde:
    echo https://github.com/cloudflare/cloudflared/releases
    echo.
    pause
    exit /b 1
)

REM Verificar si npm está instalado
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: npm no está instalado
    pause
    exit /b 1
)

echo [1/3] Iniciando aplicación Next.js...
start "Next.js - Gestión de Facturas" cmd /k "npm start"

echo [2/3] Esperando a que la aplicación esté lista...
timeout /t 10 /nobreak >nul

echo [3/3] Iniciando Cloudflare Tunnel...
echo.
echo ========================================
echo  El túnel se está iniciando...
echo  Tu aplicación estará disponible en:
echo  - URL temporal (si usas --url): Se mostrará abajo
echo  - URL permanente: https://gestion-imprenta.tu-dominio.com
echo ========================================
echo.

REM Opción 1: URL temporal (más rápido, no requiere configuración)
cloudflared tunnel --url http://localhost:3000

REM Opción 2: Túnel permanente (descomenta si ya configuraste el túnel)
REM cloudflared tunnel run gestion-imprenta

pause

