import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import QueryProvider from '@/components/QueryProvider';
import { AuthProvider } from '@/hooks/useAuth';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Alware Sales',
  description: 'Dashboard analitik penjualan terintegrasi dengan Accurate Online.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans h-full bg-background text-foreground antialiased`}>
        <ThemeProvider>
          <QueryProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
