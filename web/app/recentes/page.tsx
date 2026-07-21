'use client';

import Link from 'next/link';
import { useMapaProjetos, useProjetosRecentes, useVideosRecentes } from '@/hooks/useProjetos';
import { tempoRelativo } from '@/lib/formato';
import ListaVideos from '@/components/videos/ListaVideos';

export default function PaginaRecentes() {
  const projetos = useProjetosRecentes(8);
  const videos = useVideosRecentes(12);
  const mapa = useMapaProjetos();

  const vazio = projetos.length === 0 && videos.length === 0;

  return (
    <div className="pagina-conteudo">
      <header className="cabecalho">
        <div>
          <h1 className="titulo">🕒 Recentes</h1>
          <p className="subtitulo">Últimos projetos acessados e vídeos editados.</p>
        </div>
      </header>

      {vazio ? (
        <div className="vazio">
          <span className="vazio-icone">🕒</span>
          <h2>Sem atividade ainda</h2>
          <p>Abra um projeto ou importe um vídeo para ver o histórico aqui.</p>
          <Link href="/projetos" className="botao botao-baixar">
            Ver projetos
          </Link>
        </div>
      ) : (
        <>
          {projetos.length > 0 && (
            <section className="secao">
              <h2 className="secao-titulo">Projetos acessados</h2>
              <div className="chips">
                {projetos.map((p) => (
                  <Link
                    key={p.id}
                    href={`/projeto/${p.id}`}
                    className="chip"
                    style={{ ['--cor' as string]: p.cor }}
                  >
                    <span className="chip-icone" style={{ background: p.cor }}>
                      {p.icone}
                    </span>
                    {p.nome}
                    <small>{tempoRelativo(p.acessadoEm)}</small>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {videos.length > 0 && (
            <section className="secao">
              <h2 className="secao-titulo">Vídeos recentes</h2>
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
