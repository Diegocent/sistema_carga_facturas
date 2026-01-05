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
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    
    // Ignorar archivos problemáticos durante el build
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^\.\/(src-tauri|scripts|out|\.next|node_modules)/,
      })
    );
    
    // Excluir archivos grandes o problemáticos del análisis
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    
    return config;
  },
  // Deshabilitar build tracing problemático en Vercel
  ...(process.env.VERCEL === '1' && {
    outputFileTracingExcludes: {
      '*': [
        'src-tauri/**/*',
        'scripts/**/*',
        '*.md',
        'Dockerfile',
        'docker-compose*.yml',
        'out/**/*',
        '.dockerignore',
        '.ngrok.env',
        '.docker.env*',
      ],
    },
  }),
}

// Configuración para Tauri - exportar como estático
if (isTauri) {
  nextConfig.output = 'export';
  nextConfig.images = { unoptimized: true };
  nextConfig.trailingSlash = true;
}

module.exports = nextConfig

