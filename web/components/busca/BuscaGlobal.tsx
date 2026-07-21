'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBuscaGlobal, useMapaProjetos } from '@/hooks/useProjetos';

interface BuscaGlobalProps {
  aberto: boolean;
  aoFechar: () => void;
}

export default function BuscaGlobal({ aberto, aoFechar }: BuscaGlobalProps) {
  const [termo, setTermo] = useState('');
  const { projetos, videos } = useBuscaGlobal(termo);
  const mapa = useMapaProjetos();
  const router = useRouter();

  useEffect(() => {
    if (aberto) setTermo('');
  }, [aberto]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') aoFechar();
    }
    if (aberto) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [aberto, aoFechar]);

  if (!aberto) return null;

  function ir(caminho: string) {
    aoFechar();
    router.push(caminho);
  }

  const vazio = termo.trim() && projetos.length === 0 && videos.length === 0;

  return (
    <div className="overlay" onClick={aoFechar}>
      <div className="palette" onClick={(e) => e.stopPropagation()}>
        <input
          className="palette-input"
          autoFocus
          placeholder="Buscar projetos e vídeos..."
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
        />
        <div className="palette-resultados">
          {!termo.trim() && (
            <p className="palette-dica">Digite para buscar em todos os projetos.</p>
          )}
          {vazio && <p className="palette-dica">Nada encontrado para “{termo}”.</p>}

          {projetos.length > 0 && (
            <div className="palette-grupo">
              <span className="palette-titulo">Projetos</span>
              {projetos.map((p) => (
                <button key={p.id} className="palette-item" onClick={() => ir(`/projeto/${p.id}`)}>
                  <span className="palette-icone" style={{ background: p.cor }}>
                    {p.icone}
                  </span>
                  <span className="palette-nome">{p.nome}</span>
                </button>
              ))}
            </div>
          )}

          {videos.length > 0 && (
            <div className="palette-grupo">
              <span className="palette-titulo">Vídeos</span>
              {videos.map((v) => (
                <button
                  key={v.id}
                  className="palette-item"
                  onClick={() => ir(`/projeto/${v.projetoId}`)}
                >
                  <span className="palette-icone" style={{ background: mapa[v.projetoId]?.cor ?? '#333' }}>
                    {mapa[v.projetoId]?.icone ?? '🎬'}
                  </span>
                  <span className="palette-nome">
                    {v.titulo}
                    <small>em {mapa[v.projetoId]?.nome ?? 'projeto'}</small>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
