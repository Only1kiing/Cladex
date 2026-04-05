import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { KeepAlive } from '@/components/KeepAlive';
import { GoogleAuthProvider } from '@/components/GoogleAuthProvider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Cladex - AI Crypto Trading',
  description: 'Autonomous AI-powered crypto trading platform with multi-personality agents',
  icons: {
    icon: '/icon.svg',
    apple: '/apple-icon.svg',
  },
  openGraph: {
    title: 'Cladex - AI Crypto Trading',
    description: 'Deploy AI agents that trade crypto for you 24/7. On-chain, autonomous, yours.',
    siteName: 'Cladex',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Cladex - AI Crypto Trading',
    description: 'Deploy AI agents that trade crypto for you 24/7. On-chain, autonomous, yours.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <body className="font-sans min-h-screen bg-background dot-grid">
        <GoogleAuthProvider>
          <AuthProvider>
            <KeepAlive />
            {children}
          </AuthProvider>
        </GoogleAuthProvider>
      </body>
    </html>
  );
}
