import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gestión de Facturas',
  description: 'Sistema de gestión de facturas',
};

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

