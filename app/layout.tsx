import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';

const inter = Inter({
  subsets:  ['latin'],
  variable: '--font-inter',
  display:  'swap',
});

const poppins = Poppins({
  subsets:  ['latin'],
  weight:   ['700', '800'],
  variable: '--font-poppins',
  display:  'swap',
});

export const metadata: Metadata = {
  title:       'AHA Social Planning',
  description: 'A plataforma completa para agências que gerenciam redes sociais',
  icons:       { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${poppins.variable}`}>
      <body className="font-sans">
        <ToastProvider />
        {children}
      </body>
    </html>
  );
}
