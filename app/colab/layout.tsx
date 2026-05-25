import type { Metadata } from 'next';
import '@/styles/colab-globals.css';
import '@/styles/coolicons-font.css';

export const metadata: Metadata = {
  title: 'AHA Social Colab',
  description: 'Portal do cliente AHA Social',
};

export default function ColabLayout({ children }: { children: React.ReactNode }) {
  return children;
}
