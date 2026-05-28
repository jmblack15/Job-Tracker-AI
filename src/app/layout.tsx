import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: 'Job Tracker',
  description: 'Seguimiento de tu búsqueda de empleo',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className="h-full bg-gray-50 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
