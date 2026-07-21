'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { alternarFavoritoProjeto, excluirProjeto, tocarProjeto } from '@/lib/projetos/store';
import { tempoRelativo } from '@/lib/formato';
import type { Projeto } from '@/lib/projetos/tipos';

interface ProjetoCardProps {
  projeto: Projeto;
  qtdVideos: number;
  aoEditar: (p: Projeto) => void;
}

export default function ProjetoCard({ projeto, qtdVideos, aoEditar }: ProjetoCardProps) {
  const router = useRouter();

  function abrir() {
    tocarProjeto(projeto.id);
    router.push(`/projeto/${projeto.id}`);
  }

  function excluir() {
    if (
      confirm(
        `Excluir o projeto “${projeto.nome}”? Os vídeos dele vão para a Lixeira (podem ser restaurados).`,
      )
    ) {
      excluirProjeto(projeto.id);
    }
  }

  return (
    <div className="proj-card" style={{ ['--cor' as string]: projeto.cor }}>
      <div className="proj-card-topo">
        <span className="proj-icone" style={{ background: projeto.cor }}>
          {projeto.icone}
        </span>
        <button
          className={`proj-fav${projeto.favorito ? ' ativo' : ''}`}
          onClick={() => alternarFavoritoProjeto(projeto.id)}
          aria-label={projeto.favorito ? 'Desfavoritar' : 'Favoritar'}
          title={projeto.favorito ? 'Desfavoritar' : 'Favoritar'}
        >
          {projeto.favorito ? '⭐' : '☆'}
        </button>
      </div>

      <Link href={`/projeto/${projeto.id}`} className="proj-nome" onClick={() => tocarProjeto(projeto.id)}>
        {projeto.nome}
      </Link>
      {projeto.descricao && <p className="proj-desc">{projeto.descricao}</p>}

      <div className="proj-meta">
        <span>{qtdVideos} {qtdVideos === 1 ? 'vídeo' : 'vídeos'}</span>
        <span>•</span>
        <span>{tempoRelativo(projeto.atualizadoEm)}</span>
      </div>

      <div className="proj-acoes">
        <button className="botao botao-baixar" onClick={abrir}>
          Abrir
        </button>
        <button className="botao botao-secundario" onClick={() => aoEditar(projeto)}>
          Editar
        </button>
        <button className="botao botao-perigo" onClick={excluir}>
          Excluir
        </button>
      </div>
    </div>
  );
}
