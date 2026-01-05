/** @type {import('next').NextConfig} */
// Detectar si se está construyendo para Tauri
const isTauri = process.env.TAURI_BUILD === 'true';

const nextConfig = {
  reactStrictMode: true,
  // Evitar problemas de build tracing
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3'],
  },
  // Excluir directorios del build tracing para evitar stack overflow
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    // Ignorar archivos problemáticos durante el build
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [
        '**/src-tauri/**',
        '**/scripts/**',
        '**/*.md',
        '**/Dockerfile',
        '**/docker-compose*.yml',
      ],
    };
    return config;
  },
}

// Configuración para Tauri - exportar como estático
if (isTauri) {
  nextConfig.output = 'export';
  nextConfig.images = { unoptimized: true };
  nextConfig.trailingSlash = true;
}

module.exports = nextConfig

