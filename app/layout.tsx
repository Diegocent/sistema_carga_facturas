import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gestión de Facturas',
  description: 'Sistema de gestión de facturas',
};

/**
 * Layout raíz de la aplicación Next.js.
 * 
 * Proporciona la estructura HTML base y aplica los estilos globales.
 * 
 * @param children - Componentes hijos que se renderizarán dentro del layout
 * @returns JSX con la estructura HTML base
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

