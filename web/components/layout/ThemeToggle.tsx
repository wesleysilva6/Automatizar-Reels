'use client';

import { useEffect, useState } from 'react';

type Tema = 'claro' | 'escuro';

export default function ThemeToggle() {
  const [tema, setTema] = useState<Tema>('escuro');

  // Lê o tema já aplicado ao <html> pelo script inline (evita divergência).
  useEffect(() => {
    const atual = (document.documentElement.dataset.tema as Tema) || 'escuro';
    setTema(atual);
  }, []);

  function alternar() {
    const prox: Tema = tema === 'escuro' ? 'claro' : 'escuro';
    setTema(prox);
    document.documentElement.dataset.tema = prox;
    try {
      localStorage.setItem('nw:tema', prox);
    } catch {
      /* localStorage indisponível: mantém só na sessão */
    }
  }

  return (
    <button className="tema-toggle" onClick={alternar} aria-label="Alternar tema claro/escuro">
      <span className="sidebar-icone">{tema === 'escuro' ? '☀️' : '🌙'}</span>
      {tema === 'escuro' ? 'Tema claro' : 'Tema escuro'}
    </button>
  );
}
