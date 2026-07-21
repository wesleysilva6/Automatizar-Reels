'use client';

import { useState } from 'react';
import { moverVideos } from '@/lib/projetos/store';
import { useProjetos } from '@/hooks/useProjetos';

interface ModalMoverProps {
  aberto: boolean;
  ids: string[]; // vídeos a mover
  projetoAtualId?: string;
  aoFechar: () => void;
  aoMover?: () => void;
}

export default function ModalMover({
  aberto,
  ids,
  projetoAtualId,
  aoFechar,
  aoMover,
}: ModalMoverProps) {
  const projetos = useProjetos();
  const [alvo, setAlvo] = useState('');

  if (!aberto) return null;

  const disponiveis = projetos.filter((p) => p.id !== projetoAtualId);

  function mover() {
    if (!alvo) return;
    moverVideos(ids, alvo);
    aoMover?.();
    aoFechar();
  }

  return (
    <div className="overlay" onClick={aoFechar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-titulo">
          Mover {ids.length} {ids.length === 1 ? 'vídeo' : 'vídeos'}
        </h2>

        {disponiveis.length === 0 ? (
          <p className="palette-dica">Não há outro projeto para mover. Crie um primeiro.</p>
        ) : (
          <div className="lista-mover">
            {disponiveis.map((p) => (
              <label key={p.id} className={`mover-item${alvo === p.id ? ' ativo' : ''}`}>
                <input
                  type="radio"
                  name="mover"
                  checked={alvo === p.id}
                  onChange={() => setAlvo(p.id)}
                />
                <span className="mover-icone" style={{ background: p.cor }}>
                  {p.icone}
                </span>
                {p.nome}
              </label>
            ))}
          </div>
        )}

        <div className="modal-acoes">
          <button className="botao botao-secundario" onClick={aoFechar}>
            Cancelar
          </button>
          <button className="botao botao-baixar" onClick={mover} disabled={!alvo}>
            Mover
          </button>
        </div>
      </div>
    </div>
  );
}
