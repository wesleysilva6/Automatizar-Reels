'use client';

import { useState } from 'react';
import { useContagemVideos, useProjetos, useProjetosRecentes } from '@/hooks/useProjetos';
import ProjetoCard from '@/components/projetos/ProjetoCard';
import ModalProjeto from '@/components/projetos/ModalProjeto';
import type { Projeto } from '@/lib/projetos/tipos';

export default function PaginaProjetos() {
  const projetos = useProjetos();
  const recentes = useProjetosRecentes(4);
  const contagem = useContagemVideos();
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Projeto | null>(null);

  function abrirNovo() {
    setEditando(null);
    setModalAberto(true);
  }

  function abrirEdicao(p: Projeto) {
    setEditando(p);
    setModalAberto(true);
  }

  return (
    <div className="pagina-conteudo">
      <header className="cabecalho">
        <div>
          <h1 className="titulo">Projetos</h1>
          <p className="subtitulo">Organize seus vídeos por projeto — tudo salvo neste dispositivo.</p>
        </div>
        <button className="botao botao-baixar botao-novo" onClick={abrirNovo}>
          + Novo projeto
        </button>
      </header>

      {projetos.length === 0 ? (
        <div className="vazio">
          <span className="vazio-icone">📁</span>
          <h2>Nenhum projeto ainda</h2>
          <p>Crie seu primeiro projeto para começar a organizar seus vídeos.</p>
          <button className="botao botao-baixar" onClick={abrirNovo}>
            + Criar projeto
          </button>
        </div>
      ) : (
        <>
          {recentes.length > 0 && (
            <section className="secao">
              <h2 className="secao-titulo">🕒 Recentes</h2>
              <div className="chips">
                {recentes.map((p) => (
                  <a key={p.id} href={`/projeto/${p.id}`} className="chip" style={{ ['--cor' as string]: p.cor }}>
                    <span className="chip-icone" style={{ background: p.cor }}>
                      {p.icone}
                    </span>
                    {p.nome}
                  </a>
                ))}
              </div>
            </section>
          )}

          <section className="secao">
            <h2 className="secao-titulo">Todos os projetos</h2>
            <div className="grade-projetos">
              {projetos.map((p) => (
                <ProjetoCard
                  key={p.id}
                  projeto={p}
                  qtdVideos={contagem[p.id] ?? 0}
                  aoEditar={abrirEdicao}
                />
              ))}
            </div>
          </section>
        </>
      )}

      <ModalProjeto
        aberto={modalAberto}
        projeto={editando}
        aoFechar={() => setModalAberto(false)}
      />
    </div>
  );
}
