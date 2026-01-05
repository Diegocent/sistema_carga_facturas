/** @type {import('next').NextConfig} */
// Detectar si se está construyendo para Tauri
const isTauri = process.env.TAURI_BUILD === 'true';

const nextConfig = {
  reactStrictMode: true,
}

// Configuración para Tauri - exportar como estático
if (isTauri) {
  nextConfig.output = 'export';
  nextConfig.images = { unoptimized: true };
  nextConfig.trailingSlash = true;
}

module.exports = nextConfig

