import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: 'Cuentas Claras — Gastos entre amigos',
  description:
    'Divide los gastos de tu viaje y descubre cómo saldar las cuentas con el menor número de pagos.',
  openGraph: {
    title: 'Cuentas Claras — Gastos entre amigos',
    description: 'Gastos compartidos, amistades intactas.',
    images: [{ url: '/og.png', width: 1672, height: 941, alt: 'Cuentas Claras' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cuentas Claras — Gastos entre amigos',
    description: 'Gastos compartidos, amistades intactas.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
