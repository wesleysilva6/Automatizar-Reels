'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import BuscaGlobal from '@/components/busca/BuscaGlobal';
import { ExportProvider } from '@/contexts/ExportContext';
import Toasts from '@/components/exportar/Toasts';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [menuAberto, setMenuAberto] = useState(false);
  const [buscaAberta, setBuscaAberta] = useState(false);
  const pathname = usePathname();

  // Fecha o menu mobile ao trocar de rota.
  useEffect(() => {
    setMenuAberto(false);
  }, [pathname]);

  // Atalho Ctrl/Cmd+K abre a busca global.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setBuscaAberta((v) => !v);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <ExportProvider>
    <div className="app">
      {/* Barra superior só no mobile: abre o menu e a busca. */}
      <header className="topbar">
        <button
          className="topbar-botao"
          onClick={() => setMenuAberto(true)}
          aria-label="Abrir menu"
        >
          ☰
        </button>
        <span className="topbar-marca">
          <span>🌊</span> NovaWave
        </span>
        <button
          className="topbar-botao"
          onClick={() => setBuscaAberta(true)}
          aria-label="Buscar"
        >
          🔎
        </button>
      </header>

      <div className={`app-corpo${menuAberto ? ' menu-aberto' : ''}`}>
        <div className="backdrop" onClick={() => setMenuAberto(false)} />
        <Sidebar aoBuscar={() => setBuscaAberta(true)} aoNavegar={() => setMenuAberto(false)} />
        <main className="conteudo">{children}</main>
      </div>

      <BuscaGlobal aberto={buscaAberta} aoFechar={() => setBuscaAberta(false)} />
      <Toasts />
    </div>
    </ExportProvider>
  );
}
