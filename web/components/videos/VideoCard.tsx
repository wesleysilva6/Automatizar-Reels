'use client';

import { alternarFavoritoVideo, enviarParaLixeira } from '@/lib/projetos/store';
import { duracaoMMSS, tempoRelativo } from '@/lib/formato';
import type { VideoEntry } from '@/lib/projetos/tipos';

interface VideoCardProps {
  video: VideoEntry;
  modo: 'grid' | 'lista';
  selecionado: boolean;
  aoSelecionar: (id: string, marcado: boolean) => void;
  legendaProjeto?: string; // usado em telas globais (favoritos/recentes)
}

export default function VideoCard({
  video,
  modo,
  selecionado,
  aoSelecionar,
  legendaProjeto,
}: VideoCardProps) {
  return (
    <div className={`video-card ${modo}${selecionado ? ' selecionado' : ''}`}>
      <input
        type="checkbox"
        className="video-check"
        checked={selecionado}
        onChange={(e) => aoSelecionar(video.id, e.target.checked)}
        aria-label="Selecionar vídeo"
      />

      <div className="video-capa">
        {video.capa ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={video.capa} alt="" referrerPolicy="no-referrer" />
        ) : (
          <span className="video-capa-vazia">🎬</span>
        )}
        {video.duracao > 0 && <span className="video-dur">{duracaoMMSS(video.duracao)}</span>}
      </div>

      <div className="video-info">
        <span className="video-titulo">{video.titulo}</span>
        <span className="video-sub">
          {video.autor ? `@${video.autor}` : 'TikTok'}
          {legendaProjeto ? ` • ${legendaProjeto}` : ''} • {tempoRelativo(video.atualizadoEm)}
        </span>
      </div>

      <div className="video-acoes">
        <button
          className={`icone-btn${video.favorito ? ' ativo' : ''}`}
          onClick={() => alternarFavoritoVideo(video.id)}
          title={video.favorito ? 'Desfavoritar' : 'Favoritar'}
          aria-label={video.favorito ? 'Desfavoritar' : 'Favoritar'}
        >
          {video.favorito ? '⭐' : '☆'}
        </button>
        <a
          className="icone-btn"
          href={video.url}
          target="_blank"
          rel="noreferrer"
          title="Abrir no TikTok"
          aria-label="Abrir no TikTok"
        >
          ↗
        </a>
        <button
          className="icone-btn perigo"
          onClick={() => enviarParaLixeira(video.id)}
          title="Enviar para a Lixeira"
          aria-label="Enviar para a Lixeira"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}
