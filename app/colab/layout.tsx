import type { Metadata } from 'next';
import '@/styles/colab-globals.css';

export const metadata: Metadata = {
  title: 'AHA Social Colab',
  description: 'Calendário colaborativo de conteúdo',
};

export default function ColabLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="colab-root">
      {children}
    </div>
  );
}
