#!/bin/bash
# Script para iniciar la aplicación con Cloudflare Tunnel (Linux/Mac)
# Asegúrate de tener cloudflared instalado y configurado

echo "========================================"
echo " Iniciando Gestión de Facturas"
echo " con Cloudflare Tunnel"
echo "========================================"
echo ""

# Verificar si cloudflared está instalado
if ! command -v cloudflared &> /dev/null; then
    echo "ERROR: cloudflared no está instalado"
    echo ""
    echo "Instala cloudflared:"
    echo "  Linux: wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64"
    echo "  Mac:   brew install cloudflared"
    echo ""
    exit 1
fi

# Verificar si npm está instalado
if ! command -v npm &> /dev/null; then
    echo "ERROR: npm no está instalado"
    exit 1
fi

echo "[1/3] Iniciando aplicación Next.js..."
npm start &
APP_PID=$!

echo "[2/3] Esperando a que la aplicación esté lista..."
sleep 10

echo "[3/3] Iniciando Cloudflare Tunnel..."
echo ""
echo "========================================"
echo " El túnel se está iniciando..."
echo " Tu aplicación estará disponible en:"
echo " - URL temporal (si usas --url): Se mostrará abajo"
echo " - URL permanente: https://gestion-imprenta.tu-dominio.com"
echo "========================================"
echo ""

# Opción 1: URL temporal (más rápido, no requiere configuración)
cloudflared tunnel --url http://localhost:3000

# Opción 2: Túnel permanente (descomenta si ya configuraste el túnel)
# cloudflared tunnel run gestion-imprenta

# Si el túnel se cierra, cerrar también la app
kill $APP_PID 2>/dev/null

