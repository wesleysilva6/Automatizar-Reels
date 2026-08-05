import type { Metadata } from 'next';
import './globals.css';
import AppShell from '@/components/layout/AppShell';

export const metadata: Metadata = {
  title: 'NovaWave — Organize e baixe seus vídeos do TikTok e do YouTube',
  description:
    'Organize seus vídeos do TikTok e do YouTube em projetos, corte em partes e baixe em HD, com áudio.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        {/* Aplica o tema salvo antes da pintura, evitando flash de tema errado. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('nw:tema')||'escuro';document.documentElement.dataset.tema=t;}catch(e){document.documentElement.dataset.tema='escuro';}})();",
          }}
        />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
