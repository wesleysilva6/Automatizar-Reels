'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { alternarFavoritoProjeto, tocarProjeto } from '@/lib/projetos/store';
import { useProjeto, useVideosDoProjeto } from '@/hooks/useProjetos';
import { dataCurta } from '@/lib/formato';
import ListaVideos from '@/components/videos/ListaVideos';
import ModalProjeto from '@/components/projetos/ModalProjeto';
import Downloader from '@/components/downloader/Downloader';

export default function PaginaProjeto({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const projeto = useProjeto(id);
  const videos = useVideosDoProjeto(id);
  const [montado, setMontado] = useState(false);
  const [importar, setImportar] = useState(false);
  const [editar, setEditar] = useState(false);

  useEffect(() => {
    setMontado(true);
    tocarProjeto(id);
  }, [id]);

  // Evita piscar "não encontrado" antes da hidratação do localStorage.
  if (!montado) return <div className="pagina-conteudo" />;

  if (!projeto) {
    return (
      <div className="pagina-conteudo">
        <div className="vazio">
          <span className="vazio-icone">🔍</span>
          <h2>Projeto não encontrado</h2>
          <p>Ele pode ter sido excluído.</p>
          <Link href="/" className="botao botao-baixar">
            Voltar aos projetos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pagina-conteudo">
      <Link href="/" className="voltar">
        ← Projetos
      </Link>

      <header className="proj-cabecalho">
        <span className="proj-cabecalho-icone" style={{ background: projeto.cor }}>
          {projeto.icone}
        </span>
        <div className="proj-cabecalho-info">
          <h1 className="titulo">
            {projeto.nome}
            <button
              className={`proj-fav grande${projeto.favorito ? ' ativo' : ''}`}
              onClick={() => alternarFavoritoProjeto(projeto.id)}
              aria-label={projeto.favorito ? 'Desfavoritar' : 'Favoritar'}
            >
              {projeto.favorito ? '⭐' : '☆'}
            </button>
          </h1>
          {projeto.descricao && <p className="subtitulo">{projeto.descricao}</p>}
          <p className="proj-cabecalho-meta">
            {videos.length} {videos.length === 1 ? 'vídeo' : 'vídeos'} • criado em{' '}
            {dataCurta(projeto.criadoEm)}
          </p>
        </div>
        <div className="proj-cabecalho-acoes">
          <button className="botao botao-baixar" onClick={() => setImportar((v) => !v)}>
            {importar ? 'Fechar' : '+ Importar vídeo'}
          </button>
          <button className="botao botao-secundario" onClick={() => setEditar(true)}>
            Editar
          </button>
        </div>
      </header>

      {importar && (
        <section className="painel-importar">
          <h2 className="secao-titulo">Importar do TikTok</h2>
          <p className="subtitulo">
            Busque um link: o vídeo é salvo neste projeto e você já pode baixá-lo em partes.
          </p>
          <Downloader projetoId={projeto.id} compacto />
        </section>
      )}

      <section className="secao">
        <h2 className="secao-titulo">Vídeos</h2>
        <ListaVideos videos={videos} projetoAtualId={projeto.id} />
      </section>

      <ModalProjeto aberto={editar} projeto={projeto} aoFechar={() => setEditar(false)} />
    </div>
  );
}
