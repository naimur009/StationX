import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Providers from '@/components/Providers';
import Favicon from '@/components/Favicon';
import DynamicTitle from '@/components/DynamicTitle';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    template: '%s · StationX',
    default: 'StationX',
  },
  description: 'Restaurant Management Dashboard',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <Providers>
          <Favicon />
          <DynamicTitle />
          {children}
        </Providers>
      </body>
    </html>
  );
}
