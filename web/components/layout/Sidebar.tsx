'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from './ThemeToggle';

interface SidebarProps {
  aoBuscar: () => void;
  aoNavegar: () => void; // fecha a sidebar no mobile após clicar
}

const ITENS = [
  { href: '/', rotulo: 'Baixador', icone: '⬇️', exato: true },
  { href: '/projetos', rotulo: 'Projetos', icone: '📁', exato: false },
  { href: '/favoritos', rotulo: 'Favoritos', icone: '⭐', exato: false },
  { href: '/recentes', rotulo: 'Recentes', icone: '🕒', exato: false },
  { href: '/lixeira', rotulo: 'Lixeira', icone: '🗑️', exato: false },
  { href: '/configuracoes', rotulo: 'Configurações', icone: '⚙️', exato: false },
];

export default function Sidebar({ aoBuscar, aoNavegar }: SidebarProps) {
  const pathname = usePathname();

  function ativo(href: string, exato: boolean): boolean {
    return exato ? pathname === href : pathname.startsWith(href);
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-topo">
        <Link href="/" className="sidebar-marca" onClick={aoNavegar}>
          <span className="sidebar-logo">🌊</span>
          <span>NovaWave</span>
        </Link>
      </div>

      <button className="sidebar-busca" onClick={aoBuscar}>
        <span>🔎</span> Buscar…
      </button>

      <nav className="sidebar-nav">
        {ITENS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={aoNavegar}
            className={`sidebar-link${ativo(item.href, item.exato) ? ' ativo' : ''}`}
            aria-current={ativo(item.href, item.exato) ? 'page' : undefined}
          >
            <span className="sidebar-icone">{item.icone}</span>
            {item.rotulo}
          </Link>
        ))}
      </nav>

      <div className="sidebar-rodape">
        <ThemeToggle />
      </div>
    </aside>
  );
}
