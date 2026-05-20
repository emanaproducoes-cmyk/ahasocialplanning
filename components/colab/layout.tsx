// app/colab/layout.tsx
// Layout wrapper do AHA Social Colab — injeta o CSS global do design system.

import type { Metadata } from 'next';
import '@/styles/colab-globals.css';

export const metadata: Metadata = {
  title:       'AHA Social Colab',
  description: 'Calendário colaborativo de conteúdo para clientes',
  icons:       { icon: '/favicon.ico' },
};

export default function ColabLayout({ children }: { children: React.ReactNode }) {
  return (
    // Aplica a classe raiz do Colab para isolar as variáveis CSS
    <div className="colab-root">
      {children}
    </div>
  );
}
