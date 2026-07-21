'use client';

import { useMemo, useState } from 'react';
import { enviarParaLixeira } from '@/lib/projetos/store';
import type { VideoEntry } from '@/lib/projetos/tipos';
import VideoCard from './VideoCard';
import ModalMover from './ModalMover';

type Ordenacao = 'recentes' | 'antigos' | 'titulo' | 'duracao';

interface ListaVideosProps {
  videos: VideoEntry[];
  projetoAtualId?: string;
  legendaProjeto?: (v: VideoEntry) => string; // rótulo do projeto em telas globais
}

export default function ListaVideos({ videos, projetoAtualId, legendaProjeto }: ListaVideosProps) {
  const [termo, setTermo] = useState('');
  const [ordenacao, setOrdenacao] = useState<Ordenacao>('recentes');
  const [modo, setModo] = useState<'grid' | 'lista'>('grid');
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [modalMover, setModalMover] = useState(false);

  const filtrados = useMemo(() => {
    const q = termo.trim().toLowerCase();
    const base = q
      ? videos.filter(
          (v) => v.titulo.toLowerCase().includes(q) || v.autor.toLowerCase().includes(q),
        )
      : videos;
    const arr = [...base];
    arr.sort((a, b) => {
      switch (ordenacao) {
        case 'antigos':
          return a.atualizadoEm - b.atualizadoEm;
        case 'titulo':
          return a.titulo.localeCompare(b.titulo, 'pt-BR');
        case 'duracao':
          return b.duracao - a.duracao;
        default:
          return b.atualizadoEm - a.atualizadoEm;
      }
    });
    return arr;
  }, [videos, termo, ordenacao]);

  function selecionar(id: string, marcado: boolean) {
    setSelecionados((prev) => {
      const prox = new Set(prev);
      if (marcado) prox.add(id);
      else prox.delete(id);
      return prox;
    });
  }

  function limparSelecao() {
    setSelecionados(new Set());
  }

  function excluirSelecionados() {
    if (!confirm(`Enviar ${selecionados.size} vídeo(s) para a Lixeira?`)) return;
    selecionados.forEach((id) => enviarParaLixeira(id));
    limparSelecao();
  }

  const ids = [...selecionados];

  return (
    <div className="lista-videos">
      <div className="barra-videos">
        <input
          className="busca-videos"
          placeholder="Pesquisar nesta lista..."
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
        />
        <select
          className="select-ordenar"
          value={ordenacao}
          onChange={(e) => setOrdenacao(e.target.value as Ordenacao)}
          aria-label="Ordenar"
        >
          <option value="recentes">Mais recentes</option>
          <option value="antigos">Mais antigos</option>
          <option value="titulo">Título (A–Z)</option>
          <option value="duracao">Duração</option>
        </select>
        <div className="toggle-modo">
          <button
            className={modo === 'grid' ? 'ativo' : ''}
            onClick={() => setModo('grid')}
            aria-label="Grade"
            title="Grade"
          >
            ▦
          </button>
          <button
            className={modo === 'lista' ? 'ativo' : ''}
            onClick={() => setModo('lista')}
            aria-label="Lista"
            title="Lista"
          >
            ☰
          </button>
        </div>
      </div>

      {selecionados.size > 0 && (
        <div className="barra-selecao">
          <span>{selecionados.size} selecionado(s)</span>
          <div className="barra-selecao-acoes">
            <button className="botao botao-secundario" onClick={() => setModalMover(true)}>
              Mover
            </button>
            <button className="botao botao-perigo" onClick={excluirSelecionados}>
              Excluir
            </button>
            <button className="botao botao-fantasma" onClick={limparSelecao}>
              Limpar
            </button>
          </div>
        </div>
      )}

      {filtrados.length === 0 ? (
        <div className="vazio pequeno">
          <span className="vazio-icone">🎬</span>
          <p>{termo ? 'Nenhum vídeo corresponde à busca.' : 'Nenhum vídeo por aqui ainda.'}</p>
        </div>
      ) : (
        <div className={`grade-videos ${modo}`}>
          {filtrados.map((v) => (
            <VideoCard
              key={v.id}
              video={v}
              modo={modo}
              selecionado={selecionados.has(v.id)}
              aoSelecionar={selecionar}
              legendaProjeto={legendaProjeto?.(v)}
            />
          ))}
        </div>
      )}

      <ModalMover
        aberto={modalMover}
        ids={ids}
        projetoAtualId={projetoAtualId}
        aoFechar={() => setModalMover(false)}
        aoMover={limparSelecao}
      />
    </div>
  );
}
