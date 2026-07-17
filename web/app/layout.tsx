import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NovaWave — Baixar vídeo do TikTok em HD sem marca d’água',
  description:
    'Cole o link do TikTok e baixe o vídeo em HD, sem marca d’água, com áudio. Também baixa só a música.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
