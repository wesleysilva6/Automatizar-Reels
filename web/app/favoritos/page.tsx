'use client';

import Link from 'next/link';
import {
  useContagemVideos,
  useMapaProjetos,
  useProjetosFavoritos,
  useVideosFavoritos,
} from '@/hooks/useProjetos';
import ProjetoCard from '@/components/projetos/ProjetoCard';
import ListaVideos from '@/components/videos/ListaVideos';

export default function PaginaFavoritos() {
  const projetos = useProjetosFavoritos();
  const videos = useVideosFavoritos();
  const contagem = useContagemVideos();
  const mapa = useMapaProjetos();

  const vazio = projetos.length === 0 && videos.length === 0;

  return (
    <div className="pagina-conteudo">
      <header className="cabecalho">
        <div>
          <h1 className="titulo">⭐ Favoritos</h1>
          <p className="subtitulo">Seus projetos e vídeos marcados como favoritos.</p>
        </div>
      </header>

      {vazio ? (
        <div className="vazio">
          <span className="vazio-icone">⭐</span>
          <h2>Nada favoritado ainda</h2>
          <p>Toque na estrela de um projeto ou vídeo para vê-lo aqui.</p>
          <Link href="/projetos" className="botao botao-baixar">
            Ver projetos
          </Link>
        </div>
      ) : (
        <>
          {projetos.length > 0 && (
            <section className="secao">
              <h2 className="secao-titulo">Projetos</h2>
              <div className="grade-projetos">
                {projetos.map((p) => (
                  <ProjetoCard
                    key={p.id}
                    projeto={p}
                    qtdVideos={contagem[p.id] ?? 0}
                    aoEditar={() => {}}
                  />
                ))}
              </div>
            </section>
          )}

          {videos.length > 0 && (
            <section className="secao">
              <h2 className="secao-titulo">Vídeos</h2>
              <ListaVideos
                videos={videos}
                legendaProjeto={(v) => mapa[v.projetoId]?.nome ?? 'projeto'}
              />
            </section>
          )}
        </>
      )}
    </div>
  );
}
