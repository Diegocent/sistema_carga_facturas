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
}

// Configuración para Tauri - exportar como estático
if (isTauri) {
  nextConfig.output = 'export';
  nextConfig.images = { unoptimized: true };
  nextConfig.trailingSlash = true;
}

// En Vercel, usar output standalone para evitar problemas de tracing
if (process.env.VERCEL === '1' && !isTauri) {
  nextConfig.output = 'standalone';
  // Deshabilitar optimización de imágenes que puede causar problemas con sharp
  nextConfig.images = {
    unoptimized: false,
  };
}

module.exports = nextConfig

